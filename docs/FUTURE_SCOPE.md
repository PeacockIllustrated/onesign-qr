# OneSign — Future Scope

A roadmap of expansion opportunities for OneSign, organized by theme. Each section describes features that extend the core managed-link QR infrastructure into new markets, capabilities, and revenue streams.

---

## 1. Beyond QR: Other Scannable & Linkable Mediums

### NFC Tag Management
Same managed-link concept applied to NFC chips. Users program NFC tags with a OneSign redirect URL, then update destinations from the dashboard. High demand in retail, events, business cards, and smart packaging.

### Bio-Link Pages *(in progress)*
A single-page website with profile info and a list of clickable links, accessible at a short URL. QR codes point to the bio page. Competes with Linktree with QR as a built-in differentiator.

### Short Links
Expose the redirect infrastructure as a standalone short-link service. Users create branded short URLs that track clicks and can be updated — essentially managed links without the QR code.

### Additional Barcode Formats
Extend to Code 128, EAN-13, UPC-A, Data Matrix, and PDF417 for inventory management, product packaging, and logistics use cases.

---

## 2. Industry-Specific Solutions

### Restaurant & Menu QR
Dedicated template where a QR code points to a managed digital menu. Restaurants update prices, items, and availability without reprinting table tents. Includes a menu-builder UI.

### Event & Ticketing QR
QR codes that encode ticket data with check-in status and attendee info. Dashboard shows real-time check-in analytics, capacity tracking, and VIP routing.

### Real Estate
QR codes on property signs link to listing pages. Agents update listing details, photos, and price without reprinting signs. Analytics show buyer interest per property.

### Product Packaging & Authentication
Each product unit gets a unique QR. Consumers scan to verify authenticity, view product info, register warranties, or access digital manuals. Requires bulk generation capabilities.

---

## 3. Bulk & API Infrastructure

### Bulk QR Generation
Upload a CSV of URLs, receive a ZIP of styled QR codes. Essential for enterprise use cases: unique QR per product unit, per event badge, per direct mail piece.

### Public API & Webhooks
REST API so developers create, manage, and track QR codes programmatically. Webhooks fire on scan events (integrates with Zapier, Make, n8n). API keys with usage tiers.

### Embeddable Widget
JavaScript snippet that lets other websites embed the OneSign QR generator directly — white-labeled or branded. Revenue through embedding fees or referral credits.

---

## 4. Analytics & Intelligence

### Scan Heatmaps
Geographic heatmap visualization showing where scans are concentrated. City-level and country-level views.

### A/B Destination Testing
One QR code, two destinations. Split traffic and measure engagement per variant. Powerful for marketing campaigns and landing page optimization.

### Conversion Tracking
After a redirect, track whether users complete an action on the destination page via a tracking pixel or JS snippet. Closes the loop between "scanned" and "converted."

### Scheduled Destination Switching
Rules-based destination changes: "point to Menu A on weekdays, Menu B on weekends" or "switch to holiday promo page Dec 20-31." Time-zone aware.

### Scan Alerts
Email or Slack notifications when a QR code is scanned, when scan volume exceeds a threshold, or when scans come from a new geographic region.

---

## 5. Design & Branding Tools

### Template Gallery
Pre-designed QR styles: holiday themes, brand color presets, industry-specific designs. Users pick a template and customize. Community submissions for variety.

### AI Logo Integration
Upload a brand logo and receive automatic suggestions for optimal placement, sizing, and color contrast to maximize scannability while maintaining brand identity.

### Frame & Call-to-Action Overlays
Add text frames around the QR code: "Scan Me!", "View Menu", "Get 20% Off." Common in print marketing. Multiple frame styles and positions.

### Brand Kit
Save brand colors, logos, fonts, and preferred QR styles. All new QR codes auto-apply the brand kit for visual consistency across campaigns.

---

## 6. Platform & Distribution

### Print-on-Demand Integration
Generate a QR and directly order printed stickers, table tents, business cards, or posters through partner print services (Printful, Sticker Mule).

### Canva & Figma Plugins
Designers drag-and-drop managed QR codes directly into their design tools. QR stays synced with the dashboard — update the destination without re-exporting the design.

### WordPress & Shopify Plugins
Auto-generate managed QR codes for each product page, blog post, or landing page. Embeds QR in the admin panel with one-click copy/download.

### Mobile Companion App
iOS/Android app for managing QR codes on the go, scanning any QR to see analytics, and quick-creating codes from the phone camera or clipboard.

---

## 7. Team & Enterprise Features

### Team Workspaces
Multiple users managing QR codes under one organization. Role-based permissions: admin (full access), editor (create/edit), viewer (read-only analytics).

### White-Label & Custom Domains
Enterprise customers use their own domain for redirect URLs (e.g., `links.theirbrand.com/r/slug`). Full white-labeling of the dashboard and public pages.

### Folders & Campaign Organization
Group QR codes into campaigns, folders, or tags. Aggregate analytics at the campaign level. Bulk operations (activate/deactivate, export, style update).

### SSO & SAML
Enterprise single sign-on via SAML 2.0, Google Workspace, Microsoft Entra ID, and Okta. Required for large organization adoption.

---

## 8. Monetization

### Freemium Tiers
- **Free:** 5 QR codes, basic analytics, 1 bio page, OneSign branding on pages
- **Pro:** Unlimited QR codes, advanced analytics, custom domains, no branding, A/B testing
- **Enterprise:** API access, team workspaces, SSO, dedicated support, SLA

### Scan-Based Pricing
Charge per scan beyond a monthly threshold. Aligns cost with value delivered — the more scans a QR gets, the more valuable it is to the customer.

### Template Marketplace
Sell premium QR templates, frame designs, and theme packs. Designers can submit and earn revenue share. Creates a community flywheel.

---

## Priority Recommendations

If pursuing these in order of impact vs. effort:

1. **Bio-Link Pages** — Minimal new infrastructure, high demand, competes with Linktree *(currently in development)*
2. **Bulk Generation + API** — Unlocks enterprise and developer use cases
3. **A/B Testing + Scheduled Destinations** — Unique differentiator most QR generators lack
4. **Team Workspaces** — Required for B2B sales and enterprise contracts
5. **Short Links** — Leverages existing redirect system with minimal new code
