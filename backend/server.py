from fastapi import FastAPI, APIRouter, HTTPException, Query, UploadFile, File, Form, Header, Depends
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
import xml.etree.ElementTree as ET
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

# Auth config
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-change-me')
JWT_ALG = 'HS256'
JWT_EXP_DAYS = 30

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


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
    size: str = "12x16"
    orientation: str = "portrait"
    elev: Optional[float] = None
    image: Optional[str] = ""
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
    size: str = "12x16"
    orientation: str = "portrait"
    elev: Optional[float] = None
    image: Optional[str] = ""
    route_id: Optional[str] = None
    route_color: Optional[str] = "#cd7b41"


class OrderCreate(BaseModel):
    client_id: str
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


async def get_optional_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        return None
    user = await db.users.find_one({"id": payload.get("sub")})
    if user:
        user.pop("_id", None)
    return user


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


def _haversine_km(a, b):
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def parse_gpx(raw: bytes):
    """Parse GPX bytes -> route dict. Handles namespaced or plain GPX."""
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        raise HTTPException(status_code=400, detail="Invalid GPX file")

    def local(tag):
        return tag.split('}')[-1]

    pts = []
    name = None
    for el in root.iter():
        t = local(el.tag)
        if t in ("trkpt", "rtept", "wpt"):
            try:
                lat = float(el.attrib.get("lat"))
                lon = float(el.attrib.get("lon"))
                pts.append([lat, lon])
            except (TypeError, ValueError):
                continue
        elif t == "name" and name is None and el.text and el.text.strip():
            name = el.text.strip()

    if not pts:
        raise HTTPException(status_code=400, detail="No track points found in GPX")

    # Downsample for transport/rendering
    if len(pts) > MAX_ROUTE_POINTS:
        step = math.ceil(len(pts) / MAX_ROUTE_POINTS)
        sampled = pts[::step]
        if sampled[-1] != pts[-1]:
            sampled.append(pts[-1])
    else:
        sampled = pts

    lats = [p[0] for p in pts]
    lons = [p[1] for p in pts]
    bounds = [[min(lats), min(lons)], [max(lats), max(lons)]]
    center = [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2]
    dist = sum(_haversine_km(pts[i], pts[i + 1]) for i in range(len(pts) - 1))

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
async def register(body: RegisterBody):
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
    return {"token": make_token(user["id"]), "user": public_user(user)}


@api_router.post("/auth/login")
async def login(body: LoginBody):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await migrate_anon(body.client_id, user["id"])
    return {"token": make_token(user["id"]), "user": public_user(user)}


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


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
