from fastapi import FastAPI, APIRouter, HTTPException, Query, UploadFile, File, Form, Header, Depends, Request, Response
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Dict
import uuid
import math
import smtplib
import asyncio
import xml.etree.ElementTree as ET
from email.message import EmailMessage
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Persistent local file storage
UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', str(ROOT_DIR / 'uploads')))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_ROUTE_POINTS = 1500

# PayPal config (optional -> demo mode when absent)
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '').strip()
PAYPAL_SECRET = os.environ.get('PAYPAL_SECRET', '').strip()
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'sandbox').strip()
PAYPAL_BASE = 'https://api-m.paypal.com' if PAYPAL_MODE == 'live' else 'https://api-m.sandbox.paypal.com'
PAYPAL_ENABLED = bool(PAYPAL_CLIENT_ID and PAYPAL_SECRET)

MAP_PRICE = 249.00

# Email config (generic SMTP so any provider works via env). Leave SMTP_HOST
# blank to disable email — build requests are still saved regardless.
SMTP_HOST = os.environ.get('SMTP_HOST', '').strip()
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587').strip() or '587')
SMTP_USER = os.environ.get('SMTP_USER', '').strip()
SMTP_PASS = os.environ.get('SMTP_PASS', '').strip()
SMTP_FROM = os.environ.get('SMTP_FROM', SMTP_USER).strip()
SMTP_STARTTLS = os.environ.get('SMTP_STARTTLS', 'true').strip().lower() in ('1', 'true', 'yes', 'on')
PROOF_NOTIFY_EMAIL = os.environ.get('PROOF_NOTIFY_EMAIL', '').strip()
ADMIN_EMAILS = [e.strip().lower() for e in os.environ.get('ADMIN_EMAILS', '').split(',') if e.strip()]
EMAIL_ENABLED = bool(SMTP_HOST and SMTP_FROM)

# Auth config
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-change-me')
JWT_ALG = 'HS256'
JWT_EXP_DAYS = 30

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

if JWT_SECRET == 'dev-secret-change-me':
    logger.warning(
        "SECURITY: JWT_SECRET is not set — using the insecure development default. "
        "Set JWT_SECRET in backend/.env before serving real users (see .env.example)."
    )


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ----------------------------- Models -----------------------------
class GeoResult(BaseModel):
    name: str
    sub: str
    lat: float
    lng: float


class Design(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    name: str
    sub: Optional[str] = ""
    lat: float
    lng: float
    mode: str = "relief"
    style: str = "harbor"
    size: str = "8x8"
    orientation: str = "square"
    elev: Optional[float] = None
    image: Optional[str] = ""
    bbox: Optional[Any] = None
    zoom: Optional[float] = None
    route_id: Optional[str] = None
    route_color: Optional[str] = "#cd7b41"
    created_at: str = Field(default_factory=now_iso)


class DesignCreate(BaseModel):
    client_id: str
    name: str
    sub: Optional[str] = ""
    lat: float
    lng: float
    mode: str = "relief"
    style: str = "harbor"
    size: str = "8x8"
    orientation: str = "square"
    elev: Optional[float] = None
    image: Optional[str] = ""
    bbox: Optional[Any] = None
    zoom: Optional[float] = None
    route_id: Optional[str] = None
    route_color: Optional[str] = "#cd7b41"


class OrderCreate(BaseModel):
    client_id: str
    design: Dict[str, Any]


class BuildRequestCreate(BaseModel):
    client_id: str
    name: str
    email: EmailStr
    message: Optional[str] = ""
    design: Dict[str, Any]


class CaptureBody(BaseModel):
    paypal_order_id: Optional[str] = None


class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    created_at: str


class RegisterBody(BaseModel):
    email: EmailStr
    password: str
    name: str
    client_id: Optional[str] = None


class LoginBody(BaseModel):
    email: EmailStr
    password: str
    client_id: Optional[str] = None


# ----------------------------- Auth helpers -----------------------------
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


def make_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


COOKIE_NAME = "terrane_token"
COOKIE_MAX_AGE = JWT_EXP_DAYS * 24 * 3600


def _decode_user_id(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload.get("sub")
    except Exception:
        return None


async def get_optional_user(request: Request, authorization: Optional[str] = Header(None)):
    # Prefer httpOnly cookie; fall back to Authorization header for API clients.
    token = request.cookies.get(COOKIE_NAME)
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if not token:
        return None
    user_id = _decode_user_id(token)
    if not user_id:
        return None
    user = await db.users.find_one({"id": user_id})
    if user:
        user.pop("_id", None)
    return user


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )


async def require_user(user=Depends(get_optional_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Sign in required")
    return user


def public_user(u: dict) -> dict:
    return {"id": u["id"], "email": u["email"], "name": u["name"], "created_at": u["created_at"]}


async def migrate_anon(client_id: Optional[str], user_id: str):
    """Attach a guest's anonymous designs/routes/orders to a real account."""
    if not client_id:
        return
    for coll in (db.designs, db.routes, db.orders):
        await coll.update_many({"client_id": client_id, "user_id": {"$exists": False}}, {"$set": {"user_id": user_id}})


# ----------------------------- Helpers -----------------------------
async def paypal_token() -> str:
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{PAYPAL_BASE}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        r.raise_for_status()
        return r.json()["access_token"]


# ----------------------------- Email (best-effort, provider-agnostic SMTP) -----------------------------
def _send_email_sync(to: str, subject: str, body: str) -> None:
    """Blocking SMTP send. Raises on failure; callers wrap in try/except."""
    msg = EmailMessage()
    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as s:
        if SMTP_STARTTLS:
            s.starttls()
        if SMTP_USER and SMTP_PASS:
            s.login(SMTP_USER, SMTP_PASS)
        s.send_message(msg)


async def send_email(to: str, subject: str, body: str) -> bool:
    """Best-effort email. Returns False (and logs) when disabled or on error;
    never raises so callers can treat email as non-critical."""
    if not EMAIL_ENABLED or not to:
        logger.info(f"[email disabled] would send to={to!r} subject={subject!r}")
        return False
    try:
        await asyncio.to_thread(_send_email_sync, to, subject, body)
        return True
    except Exception as e:
        logger.error(f"email send failed to={to!r}: {e}")
        return False


def _haversine_km(a, b):
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def _gpx_local_tag(tag: str) -> str:
    """Strip XML namespace from a tag name."""
    return tag.split('}')[-1]


def _gpx_extract_points_and_name(root):
    """Walk the GPX tree once, collecting [lat, lon] points and the first name."""
    pts, name = [], None
    for el in root.iter():
        t = _gpx_local_tag(el.tag)
        if t in ("trkpt", "rtept", "wpt"):
            try:
                pts.append([float(el.attrib.get("lat")), float(el.attrib.get("lon"))])
            except (TypeError, ValueError):
                continue
        elif t == "name" and name is None and el.text and el.text.strip():
            name = el.text.strip()
    return pts, name


def _downsample(pts):
    """Reduce point count for transport/rendering while keeping the last point."""
    if len(pts) <= MAX_ROUTE_POINTS:
        return pts
    step = math.ceil(len(pts) / MAX_ROUTE_POINTS)
    sampled = pts[::step]
    if sampled[-1] != pts[-1]:
        sampled.append(pts[-1])
    return sampled


def _route_metrics(pts):
    """Compute bounds, center and total distance from a list of [lat, lon] points."""
    lats = [p[0] for p in pts]
    lons = [p[1] for p in pts]
    bounds = [[min(lats), min(lons)], [max(lats), max(lons)]]
    center = [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2]
    dist = sum(_haversine_km(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
    return bounds, center, dist


def parse_gpx(raw: bytes):
    """Parse GPX bytes -> route dict. Handles namespaced or plain GPX."""
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        raise HTTPException(status_code=400, detail="Invalid GPX file")

    pts, name = _gpx_extract_points_and_name(root)
    if not pts:
        raise HTTPException(status_code=400, detail="No track points found in GPX")

    sampled = _downsample(pts)
    bounds, center, dist = _route_metrics(pts)

    return {
        "name": name,
        "points": sampled,
        "point_count": len(pts),
        "bounds": bounds,
        "center": center,
        "distance_km": round(dist, 2),
        "distance_mi": round(dist * 0.621371, 2),
    }


# ----------------------------- Routes -----------------------------
@api_router.get("/")
async def root():
    return {"message": "Terrane API", "paypal_enabled": PAYPAL_ENABLED}


@api_router.get("/config")
async def config():
    return {
        "paypal_enabled": PAYPAL_ENABLED,
        "paypal_client_id": PAYPAL_CLIENT_ID if PAYPAL_ENABLED else "",
        "price": MAP_PRICE,
        "currency": "USD",
    }


# ----------------------------- Auth -----------------------------
@api_router.post("/auth/register")
async def register(body: RegisterBody, response: Response):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": body.name.strip() or email.split("@")[0],
        "password_hash": hash_pw(body.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    await migrate_anon(body.client_id, user["id"])
    token = make_token(user["id"])
    set_auth_cookie(response, token)
    return {"token": token, "user": public_user(user)}


@api_router.post("/auth/login")
async def login(body: LoginBody, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await migrate_anon(body.client_id, user["id"])
    token = make_token(user["id"])
    set_auth_cookie(response, token)
    return {"token": token, "user": public_user(user)}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/", samesite="none", secure=True)
    return {"ok": True}


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user=Depends(require_user)):
    return public_user(user)


async def _geocode_nominatim(q: str):
    async with httpx.AsyncClient(timeout=12) as c:
        r = await c.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": q, "format": "jsonv2", "limit": 6, "addressdetails": 1},
            headers={"User-Agent": "TerraneMaps/1.0 (studio geocoder; contact@terranemaps.com)"},
        )
        r.raise_for_status()
        data = r.json()
    results = []
    for item in data:
        parts = [p.strip() for p in item.get("display_name", "").split(",")]
        name = ", ".join(parts[:2]) if len(parts) > 1 else (parts[0] if parts else item.get("display_name", ""))
        sub = ", ".join(parts[2:4]) if len(parts) > 2 else item.get("type", "")
        try:
            results.append(GeoResult(name=name, sub=sub, lat=float(item["lat"]), lng=float(item["lon"])).dict())
        except Exception:
            continue
    return results


async def _geocode_photon(q: str):
    async with httpx.AsyncClient(timeout=12) as c:
        r = await c.get(
            "https://photon.komoot.io/api/",
            params={"q": q, "limit": 6},
            headers={"User-Agent": "Mozilla/5.0 (compatible; TerraneMaps/1.0)"},
        )
        r.raise_for_status()
        data = r.json()
    results = []
    for f in data.get("features", []):
        p = f.get("properties", {})
        coords = f.get("geometry", {}).get("coordinates", [None, None])
        lng, lat = coords[0], coords[1]
        if lat is None or lng is None:
            continue
        name = p.get("name") or p.get("city") or p.get("street") or "Location"
        sub_parts = [x for x in [p.get("city") if p.get("city") != name else None, p.get("state"), p.get("country")] if x]
        try:
            results.append(GeoResult(name=name, sub=", ".join(sub_parts), lat=float(lat), lng=float(lng)).dict())
        except Exception:
            continue
    return results


@api_router.get("/geocode")
async def geocode(q: str = Query(..., min_length=1)):
    # Try Nominatim first, fall back to Photon (both key-less) for resilience against rate limits
    results = []
    try:
        results = await _geocode_nominatim(q)
    except Exception as e:
        logger.warning(f"nominatim failed: {e}")
    if not results:
        try:
            results = await _geocode_photon(q)
        except Exception as e:
            logger.error(f"photon failed: {e}")
    return {"results": results}


@api_router.get("/elevation")
async def elevation(lat: float, lng: float):
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(
                "https://api.open-meteo.com/v1/elevation",
                params={"latitude": lat, "longitude": lng},
            )
            r.raise_for_status()
            data = r.json()
        elev_list = data.get("elevation") or []
        elev_m = float(elev_list[0]) if elev_list else 0.0
    except Exception as e:
        logger.error(f"elevation error: {e}")
        elev_m = 0.0
    return {"elevation_m": round(elev_m, 1), "elevation_ft": round(elev_m * 3.28084)}


# ----------------------------- Routes (GPX file storage) -----------------------------
@api_router.post("/routes/upload")
async def upload_route(client_id: str = Form(...), file: UploadFile = File(...), user=Depends(get_optional_user)):
    if not file.filename.lower().endswith(".gpx"):
        raise HTTPException(status_code=400, detail="Only .gpx files are accepted")

    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")

    parsed = parse_gpx(raw)

    route_id = str(uuid.uuid4())
    stored_name = f"{route_id}.gpx"
    (UPLOAD_DIR / stored_name).write_bytes(raw)

    doc = {
        "id": route_id,
        "client_id": client_id,
        "original_filename": file.filename,
        "stored_filename": stored_name,
        "size_bytes": len(raw),
        "name": parsed["name"] or file.filename.rsplit(".", 1)[0],
        "points": parsed["points"],
        "point_count": parsed["point_count"],
        "bounds": parsed["bounds"],
        "center": parsed["center"],
        "distance_km": parsed["distance_km"],
        "distance_mi": parsed["distance_mi"],
        "created_at": now_iso(),
    }
    if user:
        doc["user_id"] = user["id"]
    await db.routes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/routes/{route_id}")
async def get_route(route_id: str):
    doc = await db.routes.find_one({"id": route_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Route not found")
    doc.pop("_id", None)
    return doc


@api_router.get("/routes/{route_id}/download")
async def download_route(route_id: str):
    doc = await db.routes.find_one({"id": route_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Route not found")
    path = UPLOAD_DIR / doc["stored_filename"]
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")
    return FileResponse(str(path), media_type="application/gpx+xml", filename=doc.get("original_filename", "route.gpx"))


@api_router.delete("/routes/{route_id}")
async def delete_route(route_id: str):
    doc = await db.routes.find_one({"id": route_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Route not found")
    try:
        (UPLOAD_DIR / doc["stored_filename"]).unlink(missing_ok=True)
    except Exception as e:
        logger.warning(f"could not remove file: {e}")
    await db.routes.delete_one({"id": route_id})
    return {"ok": True}


@api_router.post("/designs", response_model=Design)
async def create_design(payload: DesignCreate, user=Depends(get_optional_user)):
    design = Design(**payload.dict())
    doc = design.dict()
    if user:
        doc["user_id"] = user["id"]
    await db.designs.insert_one(doc)
    return design


@api_router.get("/designs", response_model=List[Design])
async def list_designs(client_id: Optional[str] = Query(None), user=Depends(get_optional_user)):
    if user:
        query = {"user_id": user["id"]}
    elif client_id:
        query = {"client_id": client_id}
    else:
        raise HTTPException(status_code=400, detail="client_id required for guests")
    docs = await db.designs.find(query).sort("created_at", -1).to_list(200)
    return [Design(**{k: v for k, v in d.items() if k != "_id"}) for d in docs]


@api_router.delete("/designs/{design_id}")
async def delete_design(design_id: str):
    res = await db.designs.delete_one({"id": design_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Design not found")
    return {"ok": True}


@api_router.post("/orders")
async def create_order(payload: OrderCreate, user=Depends(get_optional_user)):
    order_id = str(uuid.uuid4())
    base = {
        "id": order_id,
        "client_id": payload.client_id,
        "design": payload.design,
        "amount": MAP_PRICE,
        "currency": "USD",
        "status": "pending",
        "proof_requested": True,
        "created_at": now_iso(),
    }
    if user:
        base["user_id"] = user["id"]

    if not PAYPAL_ENABLED:
        base["demo"] = True
        base["paypal_order_id"] = None
        await db.orders.insert_one(base)
        return {"order_id": order_id, "paypal_order_id": None, "status": "pending",
                "amount": MAP_PRICE, "currency": "USD", "demo": True}

    # Real PayPal order
    try:
        token = await paypal_token()
        place = payload.design.get("name", "Custom map")
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(
                f"{PAYPAL_BASE}/v2/checkout/orders",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "intent": "CAPTURE",
                    "purchase_units": [{
                        "reference_id": order_id,
                        "description": f"Terrane relief map — {place}"[:127],
                        "amount": {"currency_code": "USD", "value": f"{MAP_PRICE:.2f}"},
                    }],
                },
            )
            r.raise_for_status()
            pp = r.json()
        base["demo"] = False
        base["paypal_order_id"] = pp["id"]
        await db.orders.insert_one(base)
        return {"order_id": order_id, "paypal_order_id": pp["id"], "status": "pending",
                "amount": MAP_PRICE, "currency": "USD", "demo": False}
    except Exception as e:
        logger.error(f"paypal create error: {e}")
        raise HTTPException(status_code=502, detail="Could not create PayPal order")


@api_router.post("/orders/{order_id}/capture")
async def capture_order(order_id: str, body: CaptureBody):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.get("demo") or not PAYPAL_ENABLED:
        await db.orders.update_one({"id": order_id}, {"$set": {"status": "captured", "captured_at": now_iso()}})
        return {"order_id": order_id, "status": "captured", "demo": True}

    try:
        token = await paypal_token()
        pp_id = body.paypal_order_id or order.get("paypal_order_id")
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(
                f"{PAYPAL_BASE}/v2/checkout/orders/{pp_id}/capture",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            )
            r.raise_for_status()
            pp = r.json()
        status = "paid" if pp.get("status") == "COMPLETED" else pp.get("status", "pending")
        await db.orders.update_one({"id": order_id}, {"$set": {"status": status, "captured_at": now_iso(), "paypal_capture": pp.get("status")}})
        return {"order_id": order_id, "status": status, "demo": False}
    except Exception as e:
        logger.error(f"paypal capture error: {e}")
        raise HTTPException(status_code=502, detail="Could not capture PayPal order")


@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.pop("_id", None)
    return order


# ----------------------------- Build requests (intent capture, no upfront payment) -----------------------------
def _build_request_summary(doc: dict) -> str:
    """Human-readable summary of a build request for the owner notification."""
    d = doc.get("design") or {}
    lat, lng = d.get("lat"), d.get("lng")
    lines = [
        f"Place: {d.get('name', '(unnamed)')}",
        f"Sub:   {d.get('sub', '')}",
        f"Coords: {lat}, {lng}",
        f"BBox:  {d.get('bbox')}",
        f"Zoom:  {d.get('zoom')}",
        f"Size:  {d.get('size', '8x8')}",
        f"Style: {d.get('style', '')}  Mode: {d.get('mode', '')}",
        "",
        f"Customer: {doc.get('name', '')} <{doc.get('email', '')}>",
        f"Message:  {doc.get('message', '') or '(none)'}",
        "",
        f"Request ID: {doc.get('id')}",
    ]
    return "\n".join(lines)


@api_router.post("/build-requests")
async def create_build_request(payload: BuildRequestCreate, user=Depends(get_optional_user)):
    request_id = str(uuid.uuid4())
    doc = {
        "id": request_id,
        "client_id": payload.client_id,
        "name": payload.name.strip(),
        "email": payload.email.lower().strip(),
        "message": (payload.message or "").strip(),
        "design": payload.design,
        "status": "requested",
        "price": MAP_PRICE,
        "currency": "USD",
        "created_at": now_iso(),
    }
    if user:
        doc["user_id"] = user["id"]
    await db.build_requests.insert_one(doc)

    # Best-effort emails — a mail failure must never break the saved request.
    email_sent = False
    try:
        place = (payload.design or {}).get("name", "a place")
        summary = _build_request_summary(doc)
        if PROOF_NOTIFY_EMAIL:
            await send_email(
                PROOF_NOTIFY_EMAIL,
                f"New build request — {place}",
                summary,
            )
        ack_body = (
            f"Hi {doc['name'] or 'there'},\n\n"
            f"Thanks for asking us to build your Terrane relief map of {place}.\n\n"
            "Here's what happens next: we hand-build your 3D relief render from survey "
            "elevation data and email you a proof to approve. You only pay ($249) once "
            "you've said yes — nothing prints before then.\n\n"
            f"Your request reference is {request_id[:8]}.\n\n"
            "— Terrane"
        )
        email_sent = await send_email(
            doc["email"],
            "We've got your Terrane map request",
            ack_body,
        )
    except Exception as e:
        logger.error(f"build-request email step failed: {e}")

    return {"request_id": request_id, "status": "requested", "email_sent": email_sent}


@api_router.get("/admin/build-requests")
async def admin_build_requests(user=Depends(require_user)):
    if user.get("email", "").lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admins only")
    docs = await db.build_requests.find().sort("created_at", -1).to_list(200)
    for d in docs:
        d.pop("_id", None)
    return docs


app.include_router(api_router)

# Browsers only need CORS here when the frontend is served from a different
# origin than the API (in production nginx serves both from one origin).
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        'CORS_ORIGINS',
        'https://terranemaps.com,https://www.terranemaps.com,http://localhost:3000',
    ).split(',')
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def ensure_indexes():
    """Create indexes on frequently-queried fields for production performance."""
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id")
        await db.designs.create_index("user_id")
        await db.designs.create_index("client_id")
        await db.designs.create_index("created_at")
        await db.routes.create_index("id")
        await db.routes.create_index("client_id")
        await db.routes.create_index("user_id")
        await db.orders.create_index("id")
        await db.orders.create_index("client_id")
        await db.orders.create_index("user_id")
        await db.build_requests.create_index("created_at")
        await db.build_requests.create_index("client_id")
        await db.build_requests.create_index("user_id")
        await db.build_requests.create_index("status")
        logger.info("MongoDB indexes ensured")
    except Exception as e:
        logger.error(f"Failed to ensure indexes: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
