from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# PayPal config (optional -> demo mode when absent)
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '').strip()
PAYPAL_SECRET = os.environ.get('PAYPAL_SECRET', '').strip()
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'sandbox').strip()
PAYPAL_BASE = 'https://api-m.paypal.com' if PAYPAL_MODE == 'live' else 'https://api-m.sandbox.paypal.com'
PAYPAL_ENABLED = bool(PAYPAL_CLIENT_ID and PAYPAL_SECRET)

MAP_PRICE = 249.00

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


class OrderCreate(BaseModel):
    client_id: str
    design: Dict[str, Any]


class CaptureBody(BaseModel):
    paypal_order_id: Optional[str] = None


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


@api_router.get("/geocode")
async def geocode(q: str = Query(..., min_length=1)):
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": q, "format": "jsonv2", "limit": 6, "addressdetails": 1},
                headers={"User-Agent": "TerraneMaps/1.0 (studio geocoder)"},
            )
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        logger.error(f"geocode error: {e}")
        raise HTTPException(status_code=502, detail="Geocoding service unavailable")

    results = []
    for item in data:
        display = item.get("display_name", "")
        parts = [p.strip() for p in display.split(",")]
        name = parts[0] if parts else display
        if len(parts) > 1:
            name = ", ".join(parts[:2])
        sub = ", ".join(parts[2:4]) if len(parts) > 2 else item.get("type", "")
        try:
            results.append(GeoResult(name=name, sub=sub, lat=float(item["lat"]), lng=float(item["lon"])).dict())
        except Exception:
            continue
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


@api_router.post("/designs", response_model=Design)
async def create_design(payload: DesignCreate):
    design = Design(**payload.dict())
    await db.designs.insert_one(design.dict())
    return design


@api_router.get("/designs", response_model=List[Design])
async def list_designs(client_id: str = Query(...)):
    docs = await db.designs.find({"client_id": client_id}).sort("created_at", -1).to_list(200)
    return [Design(**{k: v for k, v in d.items() if k != "_id"}) for d in docs]


@api_router.delete("/designs/{design_id}")
async def delete_design(design_id: str):
    res = await db.designs.delete_one({"id": design_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Design not found")
    return {"ok": True}


@api_router.post("/orders")
async def create_order(payload: OrderCreate):
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
