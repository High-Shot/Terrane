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
from contextlib import asynccontextmanager

from ratelimit import rate_limit, enforce as enforce_rate_limit

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

# Build-request fulfillment lifecycle. Admins may set any of these directly
# (transition-agnostic); every change appends {status, at} to status_history.
ALLOWED_STATUSES = ["requested", "proof_sent", "approved", "printing", "shipped", "cancelled"]

# First-party analytics (privacy-light, no third parties): only these event
# names are accepted by the public POST /api/events beacon.
EVENT_NAMES = {"pageview", "studio_opened", "place_searched", "build_request_submitted", "export_download", "proof_approved"}

# Guard against silently recording $0 "demo" orders in production. Demo checkout
# (used when no PayPal keys are set) is only allowed when explicitly enabled.
ALLOW_DEMO_CHECKOUT = os.environ.get('ALLOW_DEMO_CHECKOUT', 'false').strip().lower() in ('1', 'true', 'yes', 'on')

# Rate limits, as (max requests, window seconds) per client IP. Sized to be
# invisible to a real visitor and painful to a script: the analytics beacon is
# generous because a single page view fires several, while auth and the
# email-sending endpoints are tight.
RL_REGISTER = (5, 3600)
RL_LOGIN_IP = (10, 300)
RL_LOGIN_EMAIL = (5, 900)   # also per-email, so one IP can't grind one account
RL_CONTACT = (5, 3600)
RL_EVENTS = (120, 60)
RL_UPLOAD = (20, 3600)

# Email config (generic SMTP so any provider works via env). Leave SMTP_HOST
# blank to disable email — build requests are still saved regardless.
SMTP_HOST = os.environ.get('SMTP_HOST', '').strip()
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587').strip() or '587')
SMTP_USER = os.environ.get('SMTP_USER', '').strip()
SMTP_PASS = os.environ.get('SMTP_PASS', '').strip()
SMTP_FROM = os.environ.get('SMTP_FROM', SMTP_USER).strip()
SMTP_STARTTLS = os.environ.get('SMTP_STARTTLS', 'true').strip().lower() in ('1', 'true', 'yes', 'on')
PROOF_NOTIFY_EMAIL = os.environ.get('PROOF_NOTIFY_EMAIL', '').strip()
CONTACT_NOTIFY_EMAIL = os.environ.get('CONTACT_NOTIFY_EMAIL', '').strip()
ADMIN_EMAILS = [e.strip().lower() for e in os.environ.get('ADMIN_EMAILS', '').split(',') if e.strip()]
EMAIL_ENABLED = bool(SMTP_HOST and SMTP_FROM)

# Public site origin used to build customer-facing links in emails.
SITE_URL = os.environ.get('SITE_URL', 'https://terranemaps.com').strip().rstrip('/')

# Auth config
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-change-me')
JWT_ALG = 'HS256'
JWT_EXP_DAYS = 30

async def _ensure_indexes():
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
        await db.contacts.create_index("created_at")
        await db.events.create_index("created_at")
        await db.events.create_index("name")
        logger.info("MongoDB indexes ensured")
    except Exception as e:
        logger.error(f"Failed to ensure indexes: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await _ensure_indexes()
    yield
    # Shutdown
    client.close()


app = FastAPI(lifespan=lifespan)
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
    pitch: Optional[float] = None
    bearing: Optional[float] = None
    route_id: Optional[str] = None
    route_color: Optional[str] = "#cd7b41"
    theme: Optional[str] = None
    layers: Optional[Any] = None
    distance_m: Optional[float] = None
    dms: Optional[bool] = None
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
    pitch: Optional[float] = None
    bearing: Optional[float] = None
    route_id: Optional[str] = None
    route_color: Optional[str] = "#cd7b41"
    theme: Optional[str] = None
    layers: Optional[Any] = None
    distance_m: Optional[float] = None
    dms: Optional[bool] = None


class OrderCreate(BaseModel):
    client_id: str
    design: Dict[str, Any]
    build_request_id: Optional[str] = None


class BuildRequestCreate(BaseModel):
    client_id: str
    name: str
    email: EmailStr
    message: Optional[str] = ""
    design: Dict[str, Any]


class BuildRequestAdminPatch(BaseModel):
    status: Optional[str] = None
    proof_url: Optional[str] = None
    note: Optional[str] = None
    tracking_number: Optional[str] = None


class EventCreate(BaseModel):
    name: str
    path: Optional[str] = ""
    props: Optional[Dict[str, Any]] = None
    client_id: Optional[str] = None


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    message: str
    client_id: Optional[str] = None


class CaptureBody(BaseModel):
    # Echoed back by the PayPal SDK. It is only ever compared against the id we
    # stored at create time — never used to decide *which* PayPal order to
    # capture. See capture_order.
    paypal_order_id: Optional[str] = None
    # Proof the caller is the buyer who created this order (guest checkout has
    # no account). Optional so a signed-in owner can capture without it.
    client_id: Optional[str] = None


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
@api_router.post("/auth/register", dependencies=[Depends(rate_limit("register", *RL_REGISTER))])
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


@api_router.post("/auth/login", dependencies=[Depends(rate_limit("login_ip", *RL_LOGIN_IP))])
async def login(body: LoginBody, response: Response):
    email = body.email.lower().strip()
    # Second, per-account limit: the IP limit alone still lets a botnet spread a
    # guessing run for one inbox across many addresses.
    enforce_rate_limit("login_email", email, *RL_LOGIN_EMAIL)
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
@api_router.post("/routes/upload", dependencies=[Depends(rate_limit("upload", *RL_UPLOAD))])
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
async def delete_route(route_id: str, client_id: Optional[str] = Query(None), user=Depends(get_optional_user)):
    doc = await db.routes.find_one({"id": route_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Route not found")
    # Same ownership rule as delete_design: a user-owned route needs the
    # matching signed-in user, a guest route the matching client_id. This
    # endpoint previously deleted any route for any caller.
    owner_uid = doc.get("user_id")
    authorized = (
        (owner_uid is not None and user is not None and user.get("id") == owner_uid)
        or (owner_uid is None and client_id is not None and client_id == doc.get("client_id"))
    )
    if not authorized:
        raise HTTPException(status_code=403, detail="You can only delete your own routes")
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
async def delete_design(design_id: str, client_id: Optional[str] = Query(None), user=Depends(get_optional_user)):
    doc = await db.designs.find_one({"id": design_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Design not found")
    # Ownership check: a user-owned design requires the matching signed-in user;
    # a guest design requires the matching client_id. Prevents deleting others' designs.
    owner_uid = doc.get("user_id")
    authorized = (
        (owner_uid is not None and user is not None and user.get("id") == owner_uid)
        or (owner_uid is None and client_id is not None and client_id == doc.get("client_id"))
    )
    if not authorized:
        raise HTTPException(status_code=403, detail="You can only delete your own designs")
    await db.designs.delete_one({"id": design_id})
    return {"ok": True}


@api_router.post("/orders")
async def create_order(payload: OrderCreate, user=Depends(get_optional_user)):
    order_id = str(uuid.uuid4())

    # A linked build request (approval-at-payment flow) drives the price and
    # enriches the order with the full design captured at request time.
    build_req = None
    if payload.build_request_id:
        build_req = await db.build_requests.find_one({"id": payload.build_request_id})
    amount = float(build_req.get("price") or MAP_PRICE) if build_req else MAP_PRICE
    currency = (build_req.get("currency") if build_req else None) or "USD"

    base = {
        "id": order_id,
        "client_id": payload.client_id,
        "design": (build_req.get("design") if build_req else None) or payload.design,
        "amount": amount,
        "currency": currency,
        "status": "pending",
        "proof_requested": True,
        "created_at": now_iso(),
    }
    if build_req:
        base["build_request_id"] = build_req["id"]
    if user:
        base["user_id"] = user["id"]

    if not PAYPAL_ENABLED:
        if not ALLOW_DEMO_CHECKOUT:
            # Never silently record a $0 "captured" order when payments aren't configured.
            raise HTTPException(status_code=503, detail="Checkout is not available right now. Please contact us to complete your order.")
        base["demo"] = True
        base["paypal_order_id"] = None
        await db.orders.insert_one(base)
        return {"order_id": order_id, "paypal_order_id": None, "status": "pending",
                "amount": amount, "currency": currency, "demo": True}

    # Real PayPal order
    try:
        token = await paypal_token()
        place = base["design"].get("name", "Custom map")
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(
                f"{PAYPAL_BASE}/v2/checkout/orders",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "intent": "CAPTURE",
                    "purchase_units": [{
                        "reference_id": order_id,
                        "description": f"Terrane relief map — {place}"[:127],
                        "amount": {"currency_code": currency, "value": f"{amount:.2f}"},
                    }],
                },
            )
            r.raise_for_status()
            pp = r.json()
        base["demo"] = False
        base["paypal_order_id"] = pp["id"]
        await db.orders.insert_one(base)
        return {"order_id": order_id, "paypal_order_id": pp["id"], "status": "pending",
                "amount": amount, "currency": currency, "demo": False}
    except Exception as e:
        logger.error(f"paypal create error: {e}")
        raise HTTPException(status_code=502, detail="Could not create PayPal order")


def _order_caller_is_buyer(order: dict, user: Optional[dict], client_id: Optional[str]) -> bool:
    """Capture is not an admin action — only the buyer may trigger it.

    A signed-in buyer matches on user_id; a guest matches on the client_id they
    used to create the order. Both are checked because an order created while
    signed out can be claimed later.
    """
    owner_uid = order.get("user_id")
    if owner_uid is not None and user is not None and user.get("id") == owner_uid:
        return True
    order_cid = order.get("client_id")
    return bool(order_cid) and client_id == order_cid


def _paypal_capture_total(pp: dict):
    """Sum the COMPLETED captures in a PayPal capture response.

    Returns (amount, currency). Currency is None when nothing completed, and a
    mixed-currency response raises — neither should happen for a single-unit
    order, but silently taking the first value would defeat the amount check.
    """
    total = 0.0
    currency = None
    for unit in pp.get("purchase_units") or []:
        for cap in ((unit.get("payments") or {}).get("captures") or []):
            if cap.get("status") != "COMPLETED":
                continue
            amt = cap.get("amount") or {}
            cur = amt.get("currency_code")
            if currency is None:
                currency = cur
            elif cur != currency:
                raise ValueError(f"mixed capture currencies: {currency} and {cur}")
            total += float(amt.get("value") or 0)
    return round(total, 2), currency


@api_router.post("/orders/{order_id}/capture")
async def capture_order(order_id: str, body: CaptureBody, user=Depends(get_optional_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if not _order_caller_is_buyer(order, user, body.client_id):
        raise HTTPException(status_code=403, detail="You can only complete your own order")

    # Idempotent: PayPal's SDK can fire onApprove twice, and a retry after a
    # network blip must not re-run the fulfillment hooks (duplicate approval
    # emails, a second "printing" transition).
    if order.get("status") in ("paid", "captured"):
        return {"order_id": order_id, "status": order["status"], "demo": bool(order.get("demo"))}

    if order.get("demo"):
        if not ALLOW_DEMO_CHECKOUT:
            raise HTTPException(status_code=409, detail="This order cannot be completed. Please contact us.")
        await db.orders.update_one({"id": order_id}, {"$set": {"status": "captured", "captured_at": now_iso()}})
        await _post_capture_hooks(order)
        return {"order_id": order_id, "status": "captured", "demo": True}

    # A real order: only ever capture the PayPal order we created for it. The
    # id in the request body is the client's echo of it and is checked, not
    # trusted — accepting it verbatim would let a caller point this order at a
    # cheap PayPal order of their own and have it marked paid.
    pp_id = order.get("paypal_order_id")
    if not pp_id:
        raise HTTPException(status_code=409, detail="This order has no payment attached. Please contact us.")
    if body.paypal_order_id and body.paypal_order_id != pp_id:
        logger.error(f"capture id mismatch for order {order_id}: client sent {body.paypal_order_id!r}")
        raise HTTPException(status_code=400, detail="Payment does not match this order")

    if not PAYPAL_ENABLED:
        # Credentials went missing after the order was created. Failing loudly
        # is right: the alternative is recording an unpaid order as captured.
        logger.error(f"capture requested for order {order_id} but PayPal is not configured")
        raise HTTPException(status_code=503, detail="Payments are unavailable right now. Please contact us.")

    try:
        token = await paypal_token()
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(
                f"{PAYPAL_BASE}/v2/checkout/orders/{pp_id}/capture",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            )
            r.raise_for_status()
            pp = r.json()
    except Exception as e:
        logger.error(f"paypal capture error: {e}")
        raise HTTPException(status_code=502, detail="Could not capture PayPal order")

    status = "paid" if pp.get("status") == "COMPLETED" else pp.get("status", "pending")

    if status == "paid":
        # Confirm PayPal actually took the amount this order is for. Without
        # this the recorded price is whatever we asked for, not what was paid.
        expected = round(float(order.get("amount") or 0), 2)
        try:
            captured, captured_currency = _paypal_capture_total(pp)
        except ValueError as e:
            logger.error(f"order {order_id}: {e}")
            captured, captured_currency = 0.0, None
        if captured != expected or captured_currency != (order.get("currency") or "USD"):
            logger.error(
                f"order {order_id} amount mismatch: expected {expected} "
                f"{order.get('currency')}, captured {captured} {captured_currency}"
            )
            await db.orders.update_one(
                {"id": order_id},
                {"$set": {
                    "status": "review",
                    "captured_at": now_iso(),
                    "paypal_capture": pp.get("status"),
                    "captured_amount": captured,
                    "captured_currency": captured_currency,
                }},
            )
            # Held, not fulfilled: the money may well be in the account, but a
            # human needs to reconcile it before anything gets printed.
            raise HTTPException(status_code=409, detail="Payment needs review. We'll email you shortly.")

        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"status": status, "captured_at": now_iso(), "paypal_capture": pp.get("status"),
                      "captured_amount": captured, "captured_currency": captured_currency}},
        )
        await _post_capture_hooks(order)
        return {"order_id": order_id, "status": status, "demo": False}

    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "captured_at": now_iso(), "paypal_capture": pp.get("status")}},
    )
    return {"order_id": order_id, "status": status, "demo": False}


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


async def _send_transition_emails(doc: dict, new_status: str):
    """Customer/owner emails for a status transition. Callers wrap in try/except
    — email is best-effort and must never fail the underlying update."""
    place = (doc.get("design") or {}).get("name") or "your map"
    status_link = f"{SITE_URL}/request/{doc['id']}"

    if new_status == "proof_sent":
        lines = [
            f"Hi {doc.get('name') or 'there'},",
            "",
            f"Good news — the proof of your Terrane relief map of {place} is ready for your approval.",
        ]
        if doc.get("proof_url"):
            lines += ["", f"View your proof: {doc['proof_url']}"]
        if doc.get("note"):
            lines += ["", f"A note from the workshop: {doc['note']}"]
        lines += [
            "",
            f"Review, approve and pay here: {status_link}",
            "",
            "You only pay once you approve. Nothing prints before then.",
            "",
            "— Terrane",
        ]
        await send_email(doc.get("email", ""), f"Your Terrane proof is ready — {place}", "\n".join(lines))

    elif new_status == "shipped":
        lines = [
            f"Hi {doc.get('name') or 'there'},",
            "",
            f"Your Terrane relief map of {place} has shipped.",
        ]
        if doc.get("tracking_number"):
            lines += ["", f"Tracking number: {doc['tracking_number']}"]
        lines += [
            "",
            f"Check its status any time: {status_link}",
            "",
            "Thank you for letting us build this one for you.",
            "",
            "— Terrane",
        ]
        await send_email(doc.get("email", ""), f"Your Terrane map has shipped — {place}", "\n".join(lines))

    elif new_status == "approved":
        # Owner notification: the customer approved the proof and paid.
        if PROOF_NOTIFY_EMAIL:
            await send_email(
                PROOF_NOTIFY_EMAIL,
                f"Approved & paid — print it — {place}",
                _build_request_summary(doc),
            )


async def _approve_request_after_payment(request_id: str):
    """After a successful capture of an order linked to a build request, flip
    the request to approved (+history, paid_at) and notify the owner."""
    req = await db.build_requests.find_one({"id": request_id})
    if not req:
        return
    if req.get("status") in ("approved", "printing", "shipped"):
        return  # already paid / further along — don't regress on a double capture
    ts = now_iso()
    await db.build_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "approved", "updated_at": ts, "paid_at": ts},
         "$push": {"status_history": {"status": "approved", "at": ts}}},
    )
    req["status"] = "approved"
    await _send_transition_emails(req, "approved")


async def _post_capture_hooks(order: dict):
    """Best-effort: link a successful payment back to its build request.
    Never raises — the capture itself already succeeded."""
    try:
        if order.get("build_request_id"):
            await _approve_request_after_payment(order["build_request_id"])
    except Exception as e:
        logger.error(f"post-capture hook failed for order {order.get('id')}: {e}")


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


@api_router.get("/build-requests/{req_id}")
async def get_build_request(req_id: str):
    """Public, sanitized status view. The UUID itself is the capability — it is
    unguessable and only ever sent to the customer's own email address."""
    doc = await db.build_requests.find_one({"id": req_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Build request not found")
    d = doc.get("design") or {}
    return {
        "id": doc["id"],
        "status": doc.get("status", "requested"),
        "status_history": doc.get("status_history", []),
        "created_at": doc.get("created_at"),
        "proof_url": doc.get("proof_url"),
        "note": doc.get("note"),
        "tracking_number": doc.get("tracking_number"),
        "price": doc.get("price", MAP_PRICE),
        "currency": doc.get("currency", "USD"),
        "design": {
            "name": d.get("name"),
            "sub": d.get("sub"),
            "lat": d.get("lat"),
            "lng": d.get("lng"),
            "size": d.get("size", "8x8"),
            "theme": d.get("theme"),
        },
        "name": doc.get("name"),
        "email": doc.get("email"),
    }


@api_router.get("/admin/build-requests")
async def admin_build_requests(user=Depends(require_user)):
    if user.get("email", "").lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admins only")
    docs = await db.build_requests.find().sort("created_at", -1).to_list(200)
    for d in docs:
        d.pop("_id", None)
    return docs


@api_router.patch("/admin/build-requests/{req_id}")
async def admin_update_build_request(req_id: str, patch: BuildRequestAdminPatch, user=Depends(require_user)):
    if user.get("email", "").lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admins only")
    doc = await db.build_requests.find_one({"id": req_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Build request not found")
    if patch.status is not None and patch.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail=f"Unknown status. Allowed: {', '.join(ALLOWED_STATUSES)}")

    ts = now_iso()
    sets = {"updated_at": ts}
    for field in ("proof_url", "note", "tracking_number"):
        value = getattr(patch, field)
        if value is not None:
            sets[field] = value.strip()
    update = {"$set": sets}
    status_changed = patch.status is not None and patch.status != doc.get("status")
    if status_changed:
        sets["status"] = patch.status
        update["$push"] = {"status_history": {"status": patch.status, "at": ts}}
    await db.build_requests.update_one({"id": req_id}, update)

    updated = await db.build_requests.find_one({"id": req_id})
    updated.pop("_id", None)

    # Best-effort transition emails — never fail the update over mail trouble.
    if status_changed:
        try:
            await _send_transition_emails(updated, patch.status)
        except Exception as e:
            logger.error(f"transition email failed for request {req_id}: {e}")

    return updated


# ----------------------------- First-party events (privacy-light beacon) -----------------------------
@api_router.post("/events", dependencies=[Depends(rate_limit("events", *RL_EVENTS))])
async def create_event(payload: EventCreate):
    """Public beacon — no auth, no third parties. Only allow-listed names are
    accepted, and everything stored is truncated hard."""
    if payload.name not in EVENT_NAMES:
        raise HTTPException(status_code=400, detail="Unknown event name")
    props = {}
    if payload.props:
        for k, v in list(payload.props.items())[:8]:
            props[str(k)] = str(v)[:120]
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "path": (payload.path or "")[:200],
        "props": props,
        "client_id": payload.client_id,
        "created_at": now_iso(),
    }
    await db.events.insert_one(doc)
    return {"ok": True}


@api_router.get("/admin/stats")
async def admin_stats(user=Depends(require_user)):
    if user.get("email", "").lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admins only")
    # Volumes are small: fetch the last 30 days of events and fold in Python.
    # ISO-8601 strings from now_iso() compare correctly lexicographically.
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    events = await db.events.find(
        {"created_at": {"$gte": cutoff}}, {"_id": 0, "name": 1, "created_at": 1}
    ).to_list(50000)

    event_totals: Dict[str, int] = {}
    day_counts: Dict[Any, int] = {}
    for e in events:
        name = e.get("name") or "unknown"
        day = str(e.get("created_at") or "")[:10]  # YYYY-MM-DD
        event_totals[name] = event_totals.get(name, 0) + 1
        day_counts[(day, name)] = day_counts.get((day, name), 0) + 1
    events_by_day = [
        {"date": day, "name": name, "count": count}
        for (day, name), count in sorted(day_counts.items())
    ]

    requests_by_status: Dict[str, int] = {}
    async for row in db.build_requests.aggregate([{"$group": {"_id": "$status", "n": {"$sum": 1}}}]):
        requests_by_status[row.get("_id") or "unknown"] = row["n"]

    return {
        "events_by_day": events_by_day,
        "event_totals": event_totals,
        "requests_by_status": requests_by_status,
    }


# ----------------------------- Contact -----------------------------
@api_router.post("/contact", dependencies=[Depends(rate_limit("contact", *RL_CONTACT))])
async def create_contact(payload: ContactCreate, user=Depends(get_optional_user)):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Please include a message")
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "email": payload.email.lower().strip(),
        "message": payload.message.strip(),
        "client_id": payload.client_id,
        "created_at": now_iso(),
    }
    if user:
        doc["user_id"] = user["id"]
    await db.contacts.insert_one(doc)

    # Best-effort notification — the message is already persisted regardless.
    try:
        dest = CONTACT_NOTIFY_EMAIL or PROOF_NOTIFY_EMAIL
        if dest:
            body = (
                f"From: {doc['name']} <{doc['email']}>\n\n"
                f"{doc['message']}\n\n"
                f"Ref: {doc['id'][:8]}"
            )
            await send_email(dest, f"Contact form — {doc['name']}", body)
    except Exception as e:
        logger.error(f"contact email failed: {e}")

    return {"ok": True}


@api_router.get("/admin/contacts")
async def admin_contacts(user=Depends(require_user)):
    if user.get("email", "").lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admins only")
    docs = await db.contacts.find().sort("created_at", -1).to_list(200)
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
