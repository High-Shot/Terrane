# Product setup — Custom relief map

Create ONE product in Shopify (Products → Add product). This is the whole
catalog: a single made-to-order item.

---

## Core fields

| Field | Value |
|---|---|
| **Title** | `Custom 3D-Printed Relief Map — 8" × 8"` |
| **Price** | `249.00` USD |
| **Compare-at price** | (leave empty) |
| **Charge tax** | Yes (automatic tax handles it) |
| **Variants** | **None** — single variant. Do not add options. |
| **Inventory / SKU** | `TERRANE-RELIEF-8X8` (EDIT if you use another scheme) |
| **Track quantity** | **Off** (made to order). If you must track, enable "Continue selling when out of stock." |
| **This is a physical product** | Yes |
| **Weight** | `[WEIGHT — EDIT]` (needed for shipping rates) |
| **Product type** | `Relief map` |
| **Vendor** | `Terrane` |
| **Collections** | (optional) `Made to order` |
| **Tags** | `relief map, topographic, custom, made to order, gift` |
| **Status** | Draft until launch, then Active |

---

## Description (paste-ready HTML)

Paste this into the product **Description** using the **`< >` Show HTML** view.
No external CSS — it inherits the theme's type styles. Fill the EDIT marker.

```html
<p><strong>The place that made you, built from real terrain data and printed in relief.</strong></p>

<p>Terrane builds your map from the same public datasets surveyors and hydrographers
use — <strong>elevation from USGS 3DEP, water from NOAA, roads and place names from
OpenStreetMap</strong>. We resolve your place to exact coordinates and build the geometry
from measurements, not artistic license. If your creek bends, the model bends with it.</p>

<h3>What you get</h3>
<ul>
  <li><strong>8" × 8" square</strong> — one square foot of the place that matters,
      printed in true-scale relief you can run a thumb across.</li>
  <li><strong>Made to order.</strong> Nothing is mass-produced. Each map is built for
      one place, one time.</li>
  <li><strong>Proof before print.</strong> We build the final render from survey data
      and email it to you first. Nothing goes on the printer until you approve it —
      no surprise mountains.</li>
  <li><strong>Edition 1 of 1.</strong> Your file is printed once, for you, and never
      reproduced or resold.</li>
  <li><strong>Ready to hang.</strong> 3D printed layer by layer, inspected, mounted,
      and shipped ready for the wall.</li>
  <li><strong>Your legend line.</strong> A second line of the legend is yours — a name,
      a date, the reason. We print it and never ask.</li>
</ul>

<h3>How it works</h3>
<ol>
  <li><strong>Point to your place</strong> in the studio — an address, coordinates, or a
      GPX file.</li>
  <li><strong>Frame it</strong> — set the crop and zoom; the legend updates live with
      coordinates and true scale.</li>
  <li><strong>Approve the proof</strong> we email you.</li>
  <li><strong>We print it once</strong> and ship it to your door.</li>
</ol>

<p><strong>Ships in ~[X] weeks after you approve your proof. [EDIT]</strong>
Free US shipping, tracking included. <!-- EDIT: confirm shipping terms --></p>

<p><em>Real terrain · Proof before print · Edition 1 of 1.</em><br>
Data: USGS 3DEP · NOAA · OpenStreetMap.</p>
```

---

## Made-to-order settings (recap)

- **No inventory countdown.** This is built on demand; do not let a stock number
  gate sales.
- **Production is proof-gated.** Money is collected when the customer approves
  the proof (via a draft-order invoice), not necessarily at an up-front cart
  checkout. See below and `studio-handoff.md`.
- Set the **order confirmation email** to explain the made-to-order timeline so
  buyers who *do* check out directly aren't surprised.

---

## SEO

| Field | Value |
|---|---|
| **Page title (SEO title)** | `Custom 3D-Printed Relief Map (8" × 8") — Real Terrain \| Terrane` |
| **Meta description** | `A made-to-order 8-inch relief map of any place, built from real USGS, NOAA, and OpenStreetMap data. You approve a proof before we print. Edition 1 of 1. $249.` |
| **URL handle** | `custom-relief-map-8x8` |

---

## How the design attaches to the order (important)

The product page itself does **not** carry the map design. The design is created
in the **studio** (`studio.terranemaps.com`) and attached to the purchase as
**draft-order line-item properties** when the order is created:

- `Place`, `Coordinates`, `Bounding box`, `Zoom`, `Theme/Style`, and a
  `Proof URL` link travel on the line item.
- Shopify shows these line-item properties on the order in the admin and on the
  packing slip, so production always has the exact spec that was approved.

This means the storefront product is primarily for **discovery, SEO, and
sharing**. Its main call-to-action should send the customer into the studio
("Design your map"), which captures the design and email, and the paid order is
created downstream as a draft order. See `studio-handoff.md` for the mechanics
and the no-code (owner-creates-by-hand) v1 path.
