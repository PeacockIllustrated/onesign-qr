# OneSign – Lynx · Shopfront Product Catalogue + Higgsfield Image Prompts

**Purpose:** Source-of-truth list of launch products for `/app/shop` and the exact prompts for generating consistent product-listing imagery via Higgsfield.

**Sector:** QR / NFC / signage / link-aggregation merchandise for UK SMBs, scoped to OneSign's existing signage-and-print manufacturing capabilities.

**Currency:** GBP. Prices shown are suggested retail.

---

## Product list (17 launch SKUs)

| # | Product | Category | Price | SKU |
|---|---|---|---|---|
| 1 | Standard NFC Card | `nfc_card` | £12 | NFC-STD-001 |
| 2 | Premium Metal NFC Card | `nfc_card` | £35 | NFC-MTL-001 |
| 3 | NFC Table Dot (5-pack) | `nfc_card` | £25 | NFC-DOT-5PK |
| 4 | NFC Keychain Tag | `nfc_card` | £10 | NFC-KEY-001 |
| 5 | Counter Review Board A5 | `review_board` | £28 | RB-CTR-A5 |
| 6 | Wall Review Plaque A4 | `review_board` | £45 | RB-WALL-A4 |
| 7 | Desktop Review Block | `review_board` | £22 | RB-DSK-001 |
| 8 | Triangle Table Talker (10-pack) | `table_talker` | £18 | TT-TRI-10PK |
| 9 | Pedestal Table Talker | `table_talker` | £8 | TT-PED-001 |
| 10 | Shopfront QR Decal | `window_decal` | £15 | WD-SHP-001 |
| 11 | Large Window Poster A3 | `window_decal` | £22 | WD-POS-A3 |
| 12 | Contactless Menu Door Sticker | `window_decal` | £12 | WD-DOR-001 |
| 13 | Magnetic Van-Side QR Panel | `other` | £45 | VAN-MAG-001 |
| 14 | A-Frame Pavement Board | `other` | £85 | AF-PAV-001 |
| 15 | Café Starter Kit (bundle) | `other` | £60 | KIT-CAF-001 |
| 16 | Tradesman Bundle | `other` | £55 | KIT-TRD-001 |
| 17 | Event Pack (bundle) | `other` | £45 | KIT-EVT-001 |

### Bundle composition

- **Café Starter Kit (£60)** — 1× Counter Review Board A5 · 1× Triangle Table Talker 10-pack · 1× Shopfront QR Decal
- **Tradesman Bundle (£55)** — 2× Premium Metal NFC Cards · 1× Magnetic Van-Side QR Panel · 1× Wall Review Plaque A4
- **Event Pack (£45)** — 1× A-Frame Pavement Board · 1× NFC Table Dot 5-pack · 2× Shopfront QR Decals

### Deliberately out of scope (for now)

- **Badges / lanyards** — deferred; revisit once event-sector traction is proven.
- **Packaging stickers** ("Scan to review your order" for e-commerce boxes) — future scope.

---

## Higgsfield style lock (shared across all prompts)

Do **not** vary this block between products. It is what keeps the 17 generations visually coherent as a catalogue.

> **Style direction:** Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light on product edges. Seamless warm off-white backdrop (colour reference #F5F2EE) with a gentle vignette and a soft grounding shadow directly beneath the subject. Minimalist styling, no props, no text overlays, no backgrounds beyond the backdrop. Shallow depth of field, tack-sharp focus on the product. Square 1:1 aspect ratio. Confident negative space, editorial catalogue composition, clean premium finish.

### Consistency tip — use a style reference

On your first successful generation, save it and **upload it as a style-reference image** for the remaining 16. Most Higgsfield workflows let you pin a reference; it locks palette, backdrop, lighting character, and shadow direction far more tightly than text alone. If Higgsfield exposes a seed, lock the seed too.

---

## Per-product prompts (copy-paste ready)

Each prompt below is complete and self-contained. Copy the whole block into Higgsfield.

### 1. Standard NFC Card

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light on product edges. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadow directly beneath the subject. Minimalist styling, no props, no text overlays. Shallow depth of field, tack-sharp focus. Square 1:1 aspect ratio. Confident negative space, editorial catalogue composition.

Subject: A single matte white PVC card, credit-card size (85×54mm), photographed at a slight 20° angle showing both the face and the card's thickness. The face has a clean minimal sans-serif monogram logo in the centre and a subtle printed QR code in the lower-right corner. Material reads as smooth matte plastic with a soft-touch finish. Product feels premium, understated, tactile.
```

### 2. Premium Metal NFC Card

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light on product edges. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadow directly beneath the subject. Minimalist styling, no props, no text overlays. Shallow depth of field, tack-sharp focus. Square 1:1 aspect ratio. Confident negative space, editorial catalogue composition.

Subject: A single brushed aluminium card, credit-card size (85×54mm), photographed at a 30° angle catching a subtle warm highlight along one edge. Surface has finely etched micro-details — a precise minimal monogram centre and a small etched QR code in the lower-right. Material reads as cool brushed metal with substantial premium weight. Photorealistic product catalogue shot.
```

### 3. NFC Table Dot (5-pack)

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light on product edges. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadow. Minimalist styling, no props. Shallow depth of field. Square 1:1 aspect ratio. Editorial catalogue composition.

Subject: Five round matte-black vinyl dots, each 40mm diameter, arranged in a loose diagonal cascade across the backdrop with generous spacing. Each dot has a subtle debossed QR pattern just visible on its surface. Four dots lie flat; one at the far end is tilted slightly to reveal the thin adhesive layer at its back. Gentle individual shadows under each dot. Premium tactile feel.
```

### 4. NFC Keychain Tag

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light on product edges. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadow. Minimalist styling, no props. Shallow depth of field. Square 1:1 aspect ratio. Editorial catalogue composition.

Subject: A single rounded-rectangle PVC keychain tag, approximately 60mm tall, attached to a simple brushed-steel split-ring keyring. Tag surface is matte black with a crisp printed white QR code centred. The tag lies on the backdrop with the keyring extending naturally to one side, clean shadow beneath. Minimalist, pocket-premium feel.
```

### 5. Counter Review Board A5

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light catching the top edge. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadow. Minimalist styling, no props. Shallow depth of field, tack-sharp focus. Square 1:1 aspect ratio. Editorial catalogue composition.

Subject: A brushed aluminium review board, A5 portrait (210×148mm), mounted on a slim matching aluminium tilt stand at a 15° backward lean. The face has etched lettering reading "Leave us a review" in a small minimal sans-serif at the top, with a crisp etched QR code below. Front-on camera with a slight downward angle. Confident product-hero feel, warm metallic highlights.
```

### 6. Wall Review Plaque A4

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadow. Minimalist styling, no props. Shallow depth of field. Square 1:1 aspect ratio. Editorial catalogue composition.

Subject: A matte black acrylic wall plaque, A4 portrait (297×210mm), floating against the backdrop as if mounted on an invisible wall (no visible screws or hardware). Surface has a precise white-etched QR code centred and minimal white lettering above reading "Scan to review". Soft gradient of light across the surface gives a premium finished feel. Front-on shot, subtle drop shadow behind the plaque.
```

### 7. Desktop Review Block

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadow. Minimalist styling, no props. Shallow depth of field. Square 1:1 aspect ratio. Editorial catalogue composition.

Subject: A solid oak wooden block, rectangular, approximately 100×60×40mm, standing upright on the backdrop. The front face has a precision laser-engraved QR code and small engraved text "Scan to review" above it. Natural warm wood grain clearly visible, subtle tonal variation. Slight three-quarter angle to show both the front face and the block's depth. Tactile artisan-premium feel.
```

### 8. Triangle Table Talker (10-pack)

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadow. Minimalist styling, no props. Shallow depth of field. Square 1:1 aspect ratio. Editorial catalogue composition.

Subject: A single triangular table talker (folded card in triangular prism shape, approximately A5 footprint when closed) standing upright on the backdrop, with a neat stack of three identical folded cards beside it to suggest a 10-pack. Card surface is matte off-white with a clean minimal menu-style layout printed on the visible face — a small "Scan to order" headline near the top and a crisp printed QR code in the lower third. Simple shadow grounds each piece.
```

### 9. Pedestal Table Talker

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light catching the acrylic edges. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadow. Minimalist styling, no props. Shallow depth of field. Square 1:1 aspect ratio. Editorial catalogue composition.

Subject: A clear acrylic pedestal menu stand, approximately 120mm tall, holding a single printed insert card. The insert shows a clean minimal layout with "Scan our menu" headline and a printed QR code below. The acrylic catches subtle light on its edges showing its thickness. Front-three-quarter angle showing both the card insert and the pedestal base. Premium restaurant feel.
```

### 10. Shopfront QR Decal

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette. Minimalist styling, no props. Shallow depth of field. Square 1:1 aspect ratio. Editorial catalogue composition.

Subject: A square 200×200mm transparent vinyl decal applied to a floating pane of clean plate glass photographed head-on against the backdrop, giving the suggestion of a shop window without showing a whole scene. The vinyl has a printed QR code centred and minimal sans-serif call-to-action text reading "Scan to order" below. Very subtle window reflections keep it realistic but uncluttered, with the warm backdrop still clearly readable behind the glass.
```

### 11. Large Window Poster A3

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadow. Minimalist styling, no props. Shallow depth of field. Square 1:1 aspect ratio. Editorial catalogue composition.

Subject: An A3 portrait (297×420mm) weather-resistant printed poster lying mostly flat on the backdrop with a soft natural roll-curl at the top edge. The poster layout is clean and minimal: a large sans-serif headline "Scan for the weekly special", a printed QR code centred below, and a single warm accent colour line. Matte paper finish. Ample negative space around the poster.
```

### 12. Contactless Menu Door Sticker

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadow. Minimalist styling, no props. Shallow depth of field. Square 1:1 aspect ratio. Editorial catalogue composition.

Subject: A circular vinyl decal, approximately 100mm diameter, lying flat on the backdrop with its protective paper liner partially peeled back on one edge to reveal the adhesive underneath. The sticker face reads "Contactless Menu — Scan to view" with a printed QR code centred. Clean white sticker with a single warm accent-colour ring around the edge. Slight shadow gives it grounded presence.
```

### 13. Magnetic Van-Side QR Panel

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadow. Minimalist styling, no props. Shallow depth of field. Square 1:1 aspect ratio. Editorial catalogue composition.

Subject: A rigid rectangular magnetic vehicle panel, approximately 600×400mm in proportion, propped at a slight 15° angle on the backdrop. The front surface is a clean high-contrast print: a large printed QR code centred, a sans-serif headline "Scan to book" above, and a small single-line tagline below. Durable weather-resistant semi-matte finish with a faint sheen from the lighting. The slim magnetic backing layer is just visible along the bottom edge, indicating the product category. Trade-professional feel.
```

### 14. A-Frame Pavement Board

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light along the metal edges. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadow. Minimalist styling, no props. Shallow depth of field. Square 1:1 aspect ratio. Editorial catalogue composition.

Subject: A classic A-frame pavement sign in matte black powder-coated steel, approximately 900mm tall, photographed front-on against the backdrop. The front panel is a printed insert held in a hinged black frame, displaying a large printed QR code centred, a clean sans-serif headline "Scan to view today's menu", and a small single-line tagline below. Subtle ground shadow under the A-frame's two feet. Shopfront-signage aesthetic, confident, freestanding.
```

### 15. Café Starter Kit (bundle)

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadows. Minimalist styling, no props beyond the items. Shallow depth of field. Square 1:1 aspect ratio. Editorial catalogue composition with confident negative space.

Subject: A curated flat-lay arrangement of three items on the backdrop: top-left a brushed aluminium Counter Review Board A5 on its tilt stand; top-right a neat stack of three folded triangular table talkers; bottom-centre a square transparent vinyl Shopfront QR Decal lying flat. All three have matching clean minimal QR-and-headline treatments. Items geometrically spaced with generous negative space between them. Soft individual shadows.
```

### 16. Tradesman Bundle

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light catching metal edges. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadows. Minimalist styling, no props beyond the items. Shallow depth of field. Square 1:1 aspect ratio. Editorial catalogue composition.

Subject: A curated flat-lay of four items: two brushed aluminium Premium Metal NFC Cards overlapping slightly in the foreground (one showing face, one showing back); a rigid rectangular Magnetic Van-Side QR Panel propped behind them at a subtle angle; a matte black Wall Review Plaque A4 to the side. Warm lighting catches the aluminium card edges and the panel's semi-matte finish. Items arranged with rhythm and negative space. Trade-professional feel.
```

### 17. Event Pack (bundle)

```
Premium product photography in the style of a modern DTC catalogue — Apple product page meets Muji meets Stripe. Soft directional studio lighting from upper-left with a subtle warm amber rim light. Seamless warm off-white backdrop (#F5F2EE) with gentle vignette and soft grounding shadows. Minimalist styling, no props beyond the items. Shallow depth of field. Square 1:1 aspect ratio. Editorial catalogue composition.

Subject: A curated flat-lay of three items: a folded matte black A-Frame Pavement Board laid on its side with the hinged frame partially opened to show its shape; five round matte-black NFC Table Dots arranged in a loose scatter to one side; two square transparent Shopfront QR Decals stacked together on the opposite side. Generous negative space. Editorial catalogue feel.
```

---

## Suggested launch order

If you want to seed products in batches:

**Wave 1 — core 6 (biggest margin, best variety):**
1. Standard NFC Card
2. Premium Metal NFC Card
3. Counter Review Board A5
4. Triangle Table Talker (10-pack)
5. Shopfront QR Decal
6. A-Frame Pavement Board

**Wave 2 — fill out catalogue:**
All remaining single-SKU products.

**Wave 3 — bundles:**
Café Starter Kit, Tradesman Bundle, Event Pack.

This order gives your catalogue visible depth after Wave 1 (all 4 categories represented plus "other") and ensures bundles appear last, where they naturally upsell against single SKUs already visible.
