# Terrane → Shopify migration pack

This folder is a **migration runbook plus paste-ready assets** for moving
Terrane's storefront onto Shopify while keeping the custom map studio.

Terrane sells one thing: a **custom 3D-printed 8" × 8" topographic relief map,
$249, made to order.** The customer designs a place in the studio, we email a
proof, and they **pay at approval**. Nothing prints until they say yes.

---

## The architecture (read this first)

Two systems, two subdomains:

| Piece | Lives on | What it is |
|---|---|---|
| **Storefront + commerce** | `terranemaps.com` (Shopify) | Customized **Dawn** theme. Marketing pages, policies, checkout, payments, order + customer management. |
| **Map studio** | `studio.terranemaps.com` (stays custom) | The existing React app. Where a customer points to a place, frames it, and clicks **"Build my map."** It is NOT rebuilt in Shopify. |

**Why the studio stays custom.** The studio is real geospatial software —
address/coordinate resolution, live cropping, scale + legend computation against
USGS/NOAA/OSM data. Shopify's product options and theme editor can't reproduce
that. So the studio keeps running as-is on its own subdomain, and it *hands off*
to Shopify at the moment of purchase.

**Pay-at-approval via Draft Order (the core of the handoff).** Terrane does not
take money up front, because the design has to be proofed first. So we don't use
a normal "Add to cart → checkout" flow for custom maps. Instead:

1. Studio captures the **design + customer email** when they click "Build my map."
2. The owner builds the proof render and reviews it.
3. The owner (or the studio, via the Admin API) creates a **Shopify Draft Order**
   — a $249 custom line item carrying the design as line-item properties plus a
   link to the proof image.
4. Shopify **emails the customer an invoice** from that draft order.
5. The customer **pays the invoice** (this is the "approve the proof" moment).
6. The paid draft order becomes a real order; the owner fulfills it.

See `studio-handoff.md` for the exact flow and a working Admin API snippet.
The storefront's product page (see `product.md`) still exists for SEO, sharing,
and anyone who wants to start — but its primary button points into the studio,
not into a standard cart.

---

## Runbook — do these in order

Tasks are split between **[OWNER]** (things only you can do inside the Shopify
admin / your DNS host / the studio server) and **[ASSET]** (paste or upload a
file from this pack). EDIT markers throughout the assets flag every real
specific — timelines, carriers, dates, legal review — that you must fill in.

### Phase 1 — Store foundation  [OWNER]

- [ ] **[OWNER]** Create / open the Shopify store. Set store name **Terrane**,
      currency **USD**, weight/dimension units, and the sender email.
- [ ] **[OWNER]** **Payments.** Turn on **Shopify Payments** (cards) and enable
      **Shop Pay**, **Apple Pay**, and **Google Pay** (accelerated checkout).
      Connect **PayPal Express**. Confirm payouts + banking. Because customers
      pay by invoice from a draft order, verify a *draft-order invoice* also
      offers all of these methods (it uses the same checkout).
- [ ] **[OWNER]** **Shipping.** Create a US shipping zone. Set **free standard
      shipping** to match the site copy (EDIT if that changes). Add carriers /
      service levels. Decide whether international is offered on request.
- [ ] **[OWNER]** **Taxes.** Enable Shopify's **automatic tax** calculation for
      US destinations. Confirm nexus states.
- [ ] **[OWNER]** **Checkout settings.** Set order/customer emails, abandoned
      checkout, and the post-purchase page. Because production is made-to-order
      and proof-gated, set expectations in the order-confirmation email.
- [ ] **[OWNER]** **Customer accounts.** Enable accounts (new customer accounts
      recommended) so buyers can see order status. Optional for the invoice flow.

### Phase 2 — Theme  [OWNER] + [ASSET]

- [ ] **[OWNER]** Install the **Dawn** theme (Online Store → Themes → add Dawn).
- [ ] **[OWNER]** In **Theme settings**, set brand **colors** and **fonts** to
      the Terrane palette (see `theme-notes.md`): rust `#cd7b41`, cream
      `#f2ead6`, navy `#0b1c29` / `#0e2231`, slate `#7c93a5`; fonts
      **Archivo** (headings), **Inter** (body). JetBrains Mono for mono labels
      is applied inside the custom sections.
- [ ] **[ASSET]** Add the eight custom sections from `sections/` to the theme.
      Upload each `.liquid` file to the theme's **`sections/`** directory (via
      **Edit code**, or bundle them into a theme package). Files:
      `terrane-hero.liquid`, `terrane-data.liquid`, `terrane-how.liquid`,
      `terrane-reviews.liquid`, `terrane-gallery.liquid`, `terrane-gifting.liquid`,
      `terrane-guarantee.liquid`, `terrane-cta.liquid`.
- [ ] **[OWNER]** On the **homepage** template, add the sections in this order:
      hero → data → how → reviews → gallery → gifting → guarantee → cta
      (see `theme-notes.md`). In each section's theme-editor settings, **upload
      the images** — every image is an image_picker with a dashed placeholder
      empty state, so nothing breaks before you add media.
- [ ] **[OWNER]** Confirm every "Design your map" / studio button in the sections
      points at `https://studio.terranemaps.com` (the `studio_url` setting).

### Phase 3 — Product  [OWNER] + [ASSET]

- [ ] **[ASSET]** Create the product from `product.md`: title, paste-ready HTML
      description, price `249.00`, single variant, SEO fields.
- [ ] **[OWNER]** Set the product to **made-to-order**: no inventory tracking
      (or "continue selling when out of stock"), physical product, weight for
      shipping. Add product photos. Fill the "ships in ~X weeks" EDIT.
- [ ] **[OWNER]** Decide the product page's primary CTA. For the pay-at-approval
      flow, point the main button to the studio rather than Add-to-cart, or keep
      Add-to-cart only as a fallback. (The design is attached later via the
      draft order — see `product.md` note and `studio-handoff.md`.)

### Phase 4 — Pages  [OWNER] + [ASSET]

- [ ] **[ASSET]** Create Shopify **Pages** (Online Store → Pages) and paste the
      body HTML from `pages/`:
      `about.html`, `faq.html`, `shipping.html`, `returns.html`,
      `privacy.html`, `terms.html`, `contact.html`.
      Use the page **"Show HTML"** editor and paste each file's contents.
- [ ] **[OWNER]** For **contact.html**: assign the page the **`page.contact`**
      template so Shopify's native contact form renders, and confirm form email
      routes to **contact@terranemaps.com**. (The HTML documents this.)
- [ ] **[OWNER]** Keep the **"Starter text — review with a professional before
      launch"** notice on **privacy**, **terms**, **returns**, and **shipping**
      until a professional signs off. Fill every EDIT marker.
- [ ] **[OWNER]** Build the **navigation** menus (header + footer) to mirror the
      current site: Studio (→ studio subdomain), Gallery/How (homepage anchors),
      About, Contact, FAQ, and the Legal group (Privacy, Terms, Shipping,
      Returns).

### Phase 5 — Apps  [OWNER]

- [ ] **[OWNER]** Install only what you need. Suggested:
      a **reviews** app to replace the placeholder testimonials once you have
      real ones; an **email/marketing** app if desired. Keep the stack lean —
      the studio and draft-order flow are custom, not an app.
- [ ] **[OWNER]** If the studio will create draft orders automatically, create a
      **custom app** in the Shopify admin (Settings → Apps and sales channels →
      Develop apps) with **Admin API** scopes `write_draft_orders`,
      `read_draft_orders`, and `write_customers`. Copy the **Admin API access
      token** into the studio server's environment as `SHOPIFY_ADMIN_TOKEN`
      (never commit it). See `studio-handoff.md`.

### Phase 6 — DNS cutover  [OWNER]

- [ ] **[OWNER]** In Shopify, add the domain **terranemaps.com** (Settings →
      Domains). Point the apex `terranemaps.com` (and `www`) at Shopify per
      Shopify's DNS instructions (A record to Shopify's IP / `www` CNAME to
      `shops.myshopify.com`). Set terranemaps.com as **primary**.
- [ ] **[OWNER]** Keep **studio.terranemaps.com** pointed at the **custom studio
      host** (its existing CNAME/A record — do NOT move it to Shopify). Verify
      the studio still resolves after the apex cutover.
- [ ] **[OWNER]** After propagation, confirm HTTPS on both hosts, test the full
      path: storefront → "Design your map" → studio → "Build my map" → draft
      order → invoice email → payment → order.

---

## What's in this pack

```
shopify/
  README.md              ← you are here (runbook)
  product.md             ← product setup + paste-ready HTML description
  theme-notes.md         ← Dawn install, section order, colors/fonts
  studio-handoff.md      ← draft-order flow + Admin API snippet
  pages/
    about.html           ← [ASSET] paste into Shopify Page
    faq.html             ← [ASSET] renders FAQ as <details>/<summary>
    shipping.html        ← [ASSET] keep "review before launch" notice
    returns.html         ← [ASSET] keep "review before launch" notice
    privacy.html         ← [ASSET] keep "review before launch" notice
    terms.html           ← [ASSET] keep "review before launch" notice
    contact.html         ← [ASSET] use page.contact template
  sections/
    terrane-hero.liquid       ← [ASSET] homepage section
    terrane-data.liquid       ← [ASSET] homepage section
    terrane-how.liquid        ← [ASSET] homepage section
    terrane-reviews.liquid    ← [ASSET] homepage section
    terrane-gallery.liquid    ← [ASSET] homepage section
    terrane-gifting.liquid    ← [ASSET] homepage section
    terrane-guarantee.liquid  ← [ASSET] homepage section
    terrane-cta.liquid        ← [ASSET] homepage section
```

## Brand quick reference

- **Voice:** warm, place-sentimental, honest, no hype. "A place does not have to
  be famous to matter." Never oversell; the proof step is the promise.
- **Colors:** rust `#cd7b41` (accent), cream `#f2ead6` (text), navy `#0b1c29`
  bg-0 / `#0e2231` bg-1, slate `#7c93a5`. Panel solid `#142c3e`.
- **Fonts:** Archivo (display/headings), Inter (body), JetBrains Mono (mono
  labels / coordinates).
- **Data sources always credited:** USGS 3DEP · NOAA · OpenStreetMap.
- **Edition 1 of 1 · Your file is never resold.**
