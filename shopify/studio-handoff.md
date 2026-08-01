# Studio → Shopify handoff (pay-at-approval via Draft Orders)

Terrane collects payment **when the customer approves their proof**, not up
front. The custom studio and Shopify meet at the **Draft Order**.

---

## The flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ studio.terranemaps.com  (custom React app — stays custom)             │
│                                                                        │
│  1. Customer points to a place, frames it, sets zoom + theme.          │
│  2. Clicks "Build my map."                                             │
│     → studio captures the DESIGN (place, coords, bbox, zoom, theme)    │
│       and the customer's EMAIL. Stores a build request.                │
└───────────────┬────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Owner (or studio backend)                                             │
│                                                                        │
│  3. Owner builds the proof render from survey data, reviews it,        │
│     uploads it somewhere with a shareable PROOF URL.                   │
│  4. Create a Shopify DRAFT ORDER:                                      │
│       • custom line item: title, price "249.00", qty 1                 │
│       • line-item PROPERTIES: place, coords, bbox, zoom, theme,        │
│         proof_url  (these show on the order + packing slip)            │
│       • customer email                                                 │
│  5. Send the draft-order INVOICE (Shopify emails the customer).        │
└───────────────┬────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Shopify checkout / customer                                           │
│                                                                        │
│  6. Customer opens the invoice, reviews the proof link, and PAYS.      │
│     (This payment == "I approve the proof.")                           │
│  7. Draft order converts to a real ORDER, marked paid.                 │
│  8. Owner prints once, mounts, fulfills, and Shopify emails tracking.  │
└──────────────────────────────────────────────────────────────────────┘
```

The proof step is the promise: **nothing prints until the customer pays the
invoice for the exact proof they were shown.**

---

## v1: the no-code path (start here)

You do **not** need to write any code to launch. For the first orders:

1. Studio's "Build my map" just emails you (or writes a row) with the design +
   the customer's email. (This can be a simple form post; no Shopify API yet.)
2. You build the proof and host the image (Shopify Files, Drive, etc.).
3. In the Shopify admin: **Orders → Drafts → Create order**.
   - **Add custom item** → title `Custom 3D-Printed Relief Map — 8" × 8"`,
     price `249.00`, quantity `1`.
   - On that line item, **add line-item properties** by hand: `Place`,
     `Coordinates`, `Bounding box`, `Zoom`, `Theme`, `Proof URL`.
   - Set the **customer** (or just their email).
4. **Send invoice** — Shopify emails the customer a pay link.
5. When they pay, fulfill the order.

This is fully functional and is the recommended way to prove the flow before
automating step 3–4.

---

## v2: automate draft-order creation (Admin API)

When volume justifies it, the studio backend can create the draft order and send
the invoice via the Shopify **Admin API**
(`POST /admin/api/2024-10/draft_orders.json`).

### Secrets (never commit these)

Set these in the studio server's environment:

- `SHOPIFY_STORE` — your store subdomain, e.g. `terrane` (for
  `terrane.myshopify.com`).
- `SHOPIFY_ADMIN_TOKEN` — the Admin API access token from a **custom app**
  (Settings → Apps and sales channels → Develop apps) with scopes
  `write_draft_orders`, `read_draft_orders`, `write_customers`.

> The token is a secret. Keep it in the environment / a secrets manager. Never
> put it in the repo, the frontend, or the studio's client-side code.

### FastAPI + httpx snippet

```python
import os
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr

app = FastAPI()

SHOPIFY_STORE = os.environ["SHOPIFY_STORE"]          # e.g. "terrane"
SHOPIFY_ADMIN_TOKEN = os.environ["SHOPIFY_ADMIN_TOKEN"]  # secret; env only
API_VERSION = "2024-10"
BASE_URL = f"https://{SHOPIFY_STORE}.myshopify.com/admin/api/{API_VERSION}"

MAP_PRICE = "249.00"  # USD, string per Shopify money format
HEADERS = {
    "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
    "Content-Type": "application/json",
}


class BuildRequest(BaseModel):
    email: EmailStr
    place: str                 # "Fairhope, Alabama"
    coordinates: str           # "30.5230 N, 87.9033 W"
    bbox: str                  # "minLng,minLat,maxLng,maxLat"
    zoom: str                  # framing / zoom level
    theme: str                 # map style, e.g. "Harbor"
    proof_url: str             # link to the proof render the customer approves
    send_invoice: bool = True  # email the pay-at-approval invoice


@app.post("/api/build-to-draft-order")
async def build_to_draft_order(req: BuildRequest):
    """Turn a studio build request into a Shopify draft order and (optionally)
    email the customer the invoice they pay to approve the proof."""

    draft_order_payload = {
        "draft_order": {
            "line_items": [
                {
                    "title": 'Custom 3D-Printed Relief Map — 8" × 8"',
                    "price": MAP_PRICE,
                    "quantity": 1,
                    "requires_shipping": True,
                    "taxable": True,
                    # The approved design travels with the line item and shows
                    # on the order + packing slip for production.
                    "properties": [
                        {"name": "Place", "value": req.place},
                        {"name": "Coordinates", "value": req.coordinates},
                        {"name": "Bounding box", "value": req.bbox},
                        {"name": "Zoom", "value": req.zoom},
                        {"name": "Theme", "value": req.theme},
                        {"name": "Proof URL", "value": req.proof_url},
                        {"name": "Edition", "value": "1 of 1"},
                    ],
                }
            ],
            "email": req.email,
            "use_customer_default_address": True,
            "tags": "studio, made-to-order",
            "note": f"Proof for {req.place} — customer pays this invoice to approve.",
        }
    }

    async with httpx.AsyncClient(timeout=30) as client:
        # 1) Create the draft order.
        resp = await client.post(
            f"{BASE_URL}/draft_orders.json",
            headers=HEADERS,
            json=draft_order_payload,
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(
                status_code=502,
                detail=f"Shopify draft order failed: {resp.status_code} {resp.text}",
            )
        draft = resp.json()["draft_order"]
        draft_id = draft["id"]

        # 2) Optionally send the invoice (Shopify emails the customer a pay link).
        if req.send_invoice:
            invoice_resp = await client.post(
                f"{BASE_URL}/draft_orders/{draft_id}/send_invoice.json",
                headers=HEADERS,
                json={
                    "draft_order_invoice": {
                        "to": req.email,
                        "subject": "Your Terrane proof is ready — approve to print",
                        "custom_message": (
                            "Your proof is ready. Review it, and pay this invoice "
                            "to approve — we print your map once, just for you."
                        ),
                    }
                },
            )
            if invoice_resp.status_code not in (200, 201):
                raise HTTPException(
                    status_code=502,
                    detail=(
                        f"Draft created (id={draft_id}) but invoice send failed: "
                        f"{invoice_resp.status_code} {invoice_resp.text}"
                    ),
                )

    return {
        "draft_order_id": draft_id,
        "invoice_url": draft.get("invoice_url"),
        "status": draft.get("status"),
    }
```

Notes:

- **`invoice_url`** is returned on the draft order if you'd rather surface the
  pay link in the studio UI instead of (or in addition to) emailing it.
- When the customer pays, the draft order becomes a paid **order**; fulfill it
  and Shopify sends tracking.
- Keep the price as the string `"249.00"` — Shopify's money fields are strings.
- Line-item **properties** are the durable record of the approved spec. They are
  visible in the admin order and print on the packing slip, so production always
  builds exactly what was approved.
