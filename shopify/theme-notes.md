# Theme notes — Dawn customization

Terrane's storefront runs on Shopify's free reference theme, **Dawn**,
customized with eight self-contained Terrane sections. The sections carry their
own dark-editorial styling (scoped `<style>` keyed to each section's ID), so
they look right **regardless of Dawn's palette** — but you should still set the
theme's brand colors and fonts so Dawn's own chrome (header, cart, footer,
product page) matches.

---

## 1. Install Dawn

1. Shopify admin → **Online Store → Themes**.
2. **Add theme → Shopify's free themes → Dawn → Add**.
3. Keep Dawn in your library and **Customize** it (don't publish until ready).

## 2. Add the Terrane sections

Upload the eight files from `sections/` into the theme:

1. Themes → **⋯ → Edit code**.
2. In the **Sections** folder, **Add a new section** for each file and paste the
   matching `.liquid` contents (or upload a packaged theme with them included).
3. File names map 1:1 to section names:
   `terrane-hero`, `terrane-data`, `terrane-how`, `terrane-reviews`,
   `terrane-gallery`, `terrane-gifting`, `terrane-guarantee`, `terrane-cta`.

Each section defines a `{% schema %}` with `presets`, so it appears in the
theme editor's **Add section** picker under its own name.

## 3. Build the homepage

Open the theme editor on the **Home page** template and add the sections **in
this order** (top to bottom), removing Dawn's default demo sections:

1. **Terrane Hero** (`terrane-hero`)
2. **Terrane Data** (`terrane-data`)
3. **Terrane How** (`terrane-how`)
4. **Terrane Reviews** (`terrane-reviews`)
5. **Terrane Gallery** (`terrane-gallery`)
6. **Terrane Gifting** (`terrane-gifting`)
7. **Terrane Guarantee** (`terrane-guarantee`)
8. **Terrane CTA** (`terrane-cta`)

This mirrors the current React homepage flow (hero → the data → how it works →
reviews → gallery → gifting → guarantee → final CTA).

## 4. Add media

Every image in every section is an **image_picker** setting with a **dashed
placeholder** empty state, so nothing looks broken before you add media. In the
theme editor, open each section (and its blocks) and **upload the real photos**:
hero relief map, the three data-source images, gallery pieces, gift packaging,
etc. Placeholders disappear as soon as an image is set.

## 5. Brand colors & fonts (theme settings)

In **Theme settings → Colors**, set a scheme to the Terrane palette so Dawn's
header/footer/product/cart match the custom sections:

| Role | Hex |
|---|---|
| Background (primary) | `#0b1c29` (navy bg-0) |
| Background (secondary) | `#0e2231` (navy bg-1) |
| Panel / card solid | `#142c3e` |
| Text | `#f2ead6` (cream) |
| Dim text | `#d8cfba` (cream-dim) |
| Accent / buttons / links | `#cd7b41` (rust) |
| Accent (hover/bright) | `#e08b4c` |
| Muted / captions | `#7c93a5` (slate) |

In **Theme settings → Typography**:

- **Headings:** Archivo (heavy/black weights for display).
- **Body:** Inter.
- **Mono labels / coordinates:** JetBrains Mono — this is applied inside the
  Terrane sections via their scoped styles; if a font-family fallback is needed
  Shopify serves it via the section CSS (system monospace fallback included).

> The custom sections do **not** rely on Dawn's color schemes; they paint their
> own navy/cream/rust so the editorial look is guaranteed. Setting the theme
> palette above keeps the surrounding Dawn chrome consistent.

## 6. Where the "Design your map" CTA points

Every studio call-to-action in the sections reads from a per-section
**`studio_url`** setting that **defaults to `https://studio.terranemaps.com`**.
Buttons labeled "Design your map", "Start a gift map", "Open the studio", etc.,
all send the customer into the custom studio — not into a standard cart —
because the design is captured there and the paid order is created downstream as
a Shopify **draft order** (pay-at-approval). If the studio ever moves, change
`studio_url` in each section's theme-editor settings.

Also point the **header nav "Studio"** link and any product-page primary CTA at
the same `https://studio.terranemaps.com`.
