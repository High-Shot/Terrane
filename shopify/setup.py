#!/usr/bin/env python3
"""
Terrane -> Shopify setup. Runs from a machine that can reach Shopify (e.g. the
laptop), using the Shopify Admin API. Creates the product (as DRAFT), the pages
(UNPUBLISHED), and uploads the homepage sections into a theme (non-destructive —
the sections just become available in the theme editor; your live homepage is
not changed).

Standard library only (no pip installs needed).

Usage:
    SHOPIFY_STORE=terrane-maps.myshopify.com \
    SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxxx \
    [SHOPIFY_THEME_ID=156340977821] \
    python3 shopify/setup.py

The token must be an Admin API ACCESS token (starts with `shpat_`) from a custom
app installed with scopes: write_products, write_content, write_themes,
read_themes. Never commit the token.
"""
import os
import sys
import json
import time
import urllib.request
import urllib.error
from pathlib import Path

API = "2024-10"
HERE = Path(__file__).resolve().parent
STORE = os.environ.get("SHOPIFY_STORE", "").strip()
TOKEN = os.environ.get("SHOPIFY_ADMIN_TOKEN", "").strip()
THEME_ID = os.environ.get("SHOPIFY_THEME_ID", "").strip()

PRODUCT_HANDLE = "custom-relief-map-8x8"
PRODUCT_TITLE = 'Custom 3D-Printed Relief Map — 8" × 8"'
PRODUCT_BODY_HTML = """
<p><strong>A place does not have to be famous to matter.</strong></p>
<p>The lake where every summer happened. The street that raised you. The trail you still bring up. Terrane builds it from real elevation and street data and prints it in relief, so the place holds a wall the way it holds you. You design it in the studio. Nothing prints until you say so.</p>
<h3>The terrain is not decoration. It is measured.</h3>
<p>Every model starts from the same public datasets surveyors and hydrographers use. We resolve your place to exact coordinates and build the geometry from measurements, not artistic license. If your creek bends, the model bends with it.</p>
<ul>
  <li><strong>Elevation &middot; USGS 3DEP.</strong> Aerial lidar accurate enough to catch the rise behind your house.</li>
  <li><strong>Water &middot; NOAA.</strong> Coastlines, bays, and lake beds sit where the water actually sits.</li>
  <li><strong>Streets &middot; OpenStreetMap.</strong> Your cul-de-sac counts as much as Everest. It just has better parking.</li>
</ul>
<h3>Edition 1 of 1</h3>
<ul>
  <li>The second line of the legend is yours &mdash; a date, a name, the reason. We print it and never ask.</li>
  <li>Custom designs are printed once, for you. We never reproduce or resell your file.</li>
  <li>Coordinates are resolved and recorded to four decimal places.</li>
  <li>Scale is stated as a true ratio, computed from your frame and the ground it covers.</li>
</ul>
<h3>How it works</h3>
<ol>
  <li><strong>Point to your place.</strong> Search an address or city, enter coordinates, or upload a GPX file. If you can point to it, we can build it.</li>
  <li><strong>Frame it.</strong> Set the crop and orientation. The legend updates live as you move &mdash; coordinates, scale, the works.</li>
  <li><strong>Approve the proof.</strong> We build the final render from survey data and email it to you before anything prints. No surprise mountains.</li>
  <li><strong>We print it once.</strong> Built layer by layer, inspected, mounted, and shipped. Edition 1 of 1, and it stays that way.</li>
</ol>
<p><strong>8&quot; &times; 8&quot; square, made to order.</strong> Real terrain &middot; Proof before print &middot; Edition 1 of 1.<br>Data: USGS 3DEP &middot; NOAA &middot; OpenStreetMap.</p>
""".strip()

# (page file, page title, page handle)
PAGES = [
    ("about.html", "About", "about"),
    ("faq.html", "FAQ", "faq"),
    ("shipping.html", "Shipping", "shipping"),
    ("returns.html", "Returns", "returns"),
    ("privacy.html", "Privacy Policy", "privacy-policy"),
    ("terms.html", "Terms of Service", "terms-of-service"),
    ("contact.html", "Contact", "contact-page"),
]


def die(msg):
    print("ERROR: " + msg, file=sys.stderr)
    sys.exit(1)


if not STORE or not TOKEN:
    die("Set SHOPIFY_STORE (xxx.myshopify.com) and SHOPIFY_ADMIN_TOKEN "
        "(an Admin API access token — from a legacy custom app, or minted by "
        "oauth_setup.py on the new Dev Dashboard).")
if TOKEN.startswith("shpss_") or TOKEN.startswith("shpca_"):
    print("WARNING: SHOPIFY_ADMIN_TOKEN looks like an API SECRET/Client key, not an "
          "ACCESS token. This will 401. On the new Dev Dashboard there is no static "
          "token to reveal — run oauth_setup.py instead to mint one from your "
          "Client ID + Client secret.\n")


def api(method, path, body=None):
    url = f"https://{STORE}/admin/api/{API}/{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("X-Shopify-Access-Token", TOKEN)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode() or "{}"
            return r.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode() or "{}"
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw}
        return e.code, payload
    except Exception as e:
        return 0, {"error": str(e)}


def main():
    print(f"Connecting to {STORE} ...")
    st, shop = api("GET", "shop.json")
    if st != 200:
        die(f"Auth/connectivity failed ({st}): {json.dumps(shop)[:300]}\n"
            "Confirm the token is a 'shpat_' Admin API access token with the right "
            "scopes, and the store domain is correct.")
    print(f"  OK — connected to '{shop['shop']['name']}'\n")

    # ---------------- Product (draft) ----------------
    print("Product:")
    _, listing = api("GET", "products.json?limit=250&fields=id,handle,title")
    existing = next((p for p in listing.get("products", []) if p.get("handle") == PRODUCT_HANDLE), None)
    if existing:
        print(f"  skip — already exists (id {existing['id']})")
    else:
        body = {"product": {
            "title": PRODUCT_TITLE,
            "handle": PRODUCT_HANDLE,
            "body_html": PRODUCT_BODY_HTML,
            "vendor": "Terrane",
            "product_type": "Relief map",
            "tags": "relief map, topographic, custom, made to order, gift",
            "status": "draft",
            "metafields_global_title_tag": 'Custom 3D-Printed Relief Map (8" × 8") — Real Terrain | Terrane',
            "metafields_global_description_tag": "A made-to-order 8-inch relief map of any place, built from real USGS, NOAA, and OpenStreetMap data. You approve a proof before we print. Edition 1 of 1. $249.",
            "variants": [{
                "price": "249.00",
                "sku": "TERRANE-RELIEF-8X8",
                "requires_shipping": True,
                "taxable": True,
                "inventory_management": None,  # not tracked (made to order)
            }],
        }}
        st, res = api("POST", "products.json", body)
        if st in (200, 201):
            print(f"  created (draft) id {res['product']['id']}")
        else:
            print(f"  FAILED ({st}): {json.dumps(res)[:300]}")
        time.sleep(0.6)

    # ---------------- Pages (unpublished) ----------------
    print("\nPages (created unpublished):")
    _, plist = api("GET", "pages.json?limit=250&fields=id,handle")
    existing_handles = {p.get("handle") for p in plist.get("pages", [])}
    for fname, title, handle in PAGES:
        fpath = HERE / "pages" / fname
        if not fpath.exists():
            print(f"  skip {handle} — file missing: {fpath}")
            continue
        if handle in existing_handles:
            print(f"  skip {handle} — already exists")
            continue
        html = fpath.read_text(encoding="utf-8")
        body = {"page": {"title": title, "handle": handle, "body_html": html, "published": False}}
        st, res = api("POST", "pages.json", body)
        if st in (200, 201):
            print(f"  created '{title}' (/pages/{handle})")
        else:
            print(f"  FAILED '{title}' ({st}): {json.dumps(res)[:200]}")
        time.sleep(0.6)

    # ---------------- Theme sections (non-destructive upload) ----------------
    print("\nTheme sections:")
    theme_id = THEME_ID
    if not theme_id:
        _, tl = api("GET", "themes.json")
        main_theme = next((t for t in tl.get("themes", []) if t.get("role") == "main"), None)
        if main_theme:
            theme_id = str(main_theme["id"])
            print(f"  using published theme '{main_theme['name']}' (id {theme_id})")
        else:
            print("  SKIP — could not find a theme; set SHOPIFY_THEME_ID and re-run.")
            theme_id = None
    else:
        print(f"  using SHOPIFY_THEME_ID {theme_id}")

    if theme_id:
        for sec in sorted((HERE / "sections").glob("*.liquid")):
            key = f"sections/{sec.name}"
            body = {"asset": {"key": key, "value": sec.read_text(encoding="utf-8")}}
            st, res = api("PUT", f"themes/{theme_id}/assets.json", body)
            if st in (200, 201):
                print(f"  uploaded {key}")
            else:
                print(f"  FAILED {key} ({st}): {json.dumps(res)[:200]}")
            time.sleep(0.6)

    print("\nDone.")
    print("Next in the Shopify admin:")
    print("  • Products: review the draft product, set weight + SEO, then set Active when ready.")
    print("  • Online Store > Pages: review each page, then publish.")
    print("  • Online Store > Themes > Customize: add the Terrane sections to the home page,")
    print("    set brand colors/fonts, and point the 'Design your map' button at the studio.")


if __name__ == "__main__":
    main()
