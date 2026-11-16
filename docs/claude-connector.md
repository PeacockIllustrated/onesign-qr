# Claude connector (MCP)

Lynx exposes a remote [MCP](https://modelcontextprotocol.io) server so Claude can create and manage QR codes and link pages directly in a user's Lynx account. Ask Claude "make a QR code for our menu" and the code is created in Lynx as a managed code, with a preview in the chat and PNG / SVG / PDF download links.

## Setup (per user)

1. Sign in to Lynx → **Claude** in the sidebar (`/app/settings/claude`) → **Create key**. The key is bound to you and your currently active organisation, and is shown once.
2. Add it to Claude:
   - **claude.ai / desktop / mobile**: Settings → Connectors → *Add custom connector*, paste the connector URL `https://<lynx-domain>/api/mcp/lynx_…`. The URL contains the key; keep it private.
   - **Claude Code**:
     ```bash
     claude mcp add --transport http lynx-qr https://<lynx-domain>/api/mcp --header "Authorization: Bearer lynx_…"
     ```
3. Revoke a key at any time from the same page; Claude loses access immediately.

## Tools

| Tool | What it does |
| --- | --- |
| `create_qr_code` | Create a managed (default) or direct code with optional colours, module/eye shapes, error correction, quiet zone and custom slug. Returns a preview image and download links. |
| `list_qr_codes` | List / search the user's codes. |
| `get_qr_code` | One code with preview and fresh download links. |
| `update_qr_code` | Rename, change destination (no reprint for managed codes), pause/resume, toggle analytics, restyle. |
| `export_qr_code` | Download links at a chosen PNG size and PDF preset (50/75/100 mm sticker, A4). |
| `get_qr_analytics` | Scan totals and by-day / country / device breakdown. |
| `create_link_page` | Create a link page (`/p/<slug>`): title, intro, theme, colours, contact details, social icons and link buttons. `create_qr: true` also makes a managed QR code for it. |
| `list_link_pages` | List the user's link pages (live first). |
| `get_link_page` | One page with its links (ids) and socials. |
| `update_link_page` | Edit details/design, add or remove links, replace socials, publish/unpublish, add a QR code. |

Link pages follow the dashboard's rules: max 5 pages per user, one live page at a time. A new page goes live only if the user has no live page; otherwise it is a draft. `publish: true` makes it live and turns the previous live page into a draft. Pages are built with the grid block layout (social icons row, then one full-width link button per row), so they stay fully editable in the dashboard editor.

Deleting codes or pages and NFC/Pro carrier options are deliberately not exposed; they stay in the dashboard.

## How it works

- `POST /api/mcp` (Bearer key) and `POST /api/mcp/<key>` (key in path) — stateless Streamable HTTP, JSON responses. Code: `src/lib/mcp/`.
- Keys live in `api_keys` (migration `00028_api_keys.sql`); only a SHA-256 hash is stored. Each request re-checks that the key is not revoked and the user is still a member of the key's org.
- Tools use the service-role client, so every query is scoped explicitly by `owner_id` **and** `org_id`. Destinations go through the same URL validation (incl. DNS/SSRF check on create), rate limits and audit log as the dashboard (`new_value.via = "mcp"`).
- Download links (`/api/mcp/download/<token>`) are HMAC-signed with `MCP_DOWNLOAD_SECRET` (fallback `ADMIN_SESSION_SECRET`), expire after 24h, never contain the API key, and re-check ownership on every download.
- `/api/mcp` is exempt from the origin-based CSRF check in `src/middleware.ts` because it is authenticated by bearer key, not cookies.

## Deploy checklist

1. Apply migration `00028_api_keys.sql`.
2. Set `MCP_DOWNLOAD_SECRET` in Vercel (optional if `ADMIN_SESSION_SECRET` is set).
3. Make sure `NEXT_PUBLIC_APP_URL` / `QR_REDIRECT_BASE_URL` are the production domain — they are baked into short links and download URLs.
