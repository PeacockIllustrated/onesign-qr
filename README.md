# OneSign QR Generator

Production-grade QR code generator that creates QR codes which remain valid indefinitely.

## Features

- **Managed Links**: QR codes point to our redirect service, allowing destination changes without reprinting
- **Direct Mode**: Encode URLs directly into QR codes (permanent, no redirect)
- **Custom Styling**: Colors, module shapes, eye shapes, quiet zones
- **Multiple Exports**: SVG (vector), PNG (multiple sizes), PDF (coming soon)
- **Privacy-First Analytics**: Track scans without storing personal data
- **Built for Durability**: Your QR codes use our stable domain with no third-party dependencies

## Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (magic link)
- **Storage**: Supabase Storage
- **QR Generation**: qrcode npm package
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/onesign-qr-generator.git
cd onesign-qr-generator
```

2. Install dependencies:

```bash
npm install
```

3. Create a Supabase project at [supabase.com](https://supabase.com)

4. Copy the environment variables:

```bash
cp .env.example .env.local
```

5. Fill in your Supabase credentials in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_APP_URL=http://localhost:3000
QR_REDIRECT_BASE_URL=http://localhost:3000

IP_HASH_SALT=generate-a-random-string-here
```

6. Run the database migrations in your Supabase SQL editor:

```bash
# In Supabase Dashboard > SQL Editor, run each migration file in order:
# 1. supabase/migrations/00001_qr_code_schema.sql
# 2. supabase/migrations/00002_qr_code_rls.sql
# 3. supabase/migrations/00003_qr_code_storage.sql
```

7. Start the development server:

```bash
npm run dev
```

8. Open [http://localhost:3000](http://localhost:3000)

## How Managed QR Codes Work

The key to QR codes that "last indefinitely" is the managed link architecture:

1. **You create a QR code** with a destination URL (e.g., `https://example.com/menu`)

2. **We generate a managed link** under our domain (e.g., `https://yourdomain.com/r/abc123`)

3. **The QR code encodes our managed link**, not your destination directly

4. **When scanned**, users hit our redirect handler which looks up the current destination and redirects them

5. **To change where the QR points**, simply update the destination URL in the dashboard - no reprinting needed!

### Why This Works

- The QR code itself never changes (it always encodes the same managed link)
- The destination can be updated anytime through the dashboard
- Analytics are recorded at the redirect handler
- No dependencies on external URL shorteners that could shut down

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    page.tsx              # Landing page
    auth/                 # Authentication pages
    app/                  # Protected dashboard
      page.tsx            # QR list
      new/page.tsx        # Create QR
      qr/[id]/page.tsx    # QR detail
    r/[slug]/route.ts     # Redirect handler
    api/                  # API routes
  components/
    ui/                   # Reusable UI components
    qr/                   # QR-specific components
    auth/                 # Auth components
  lib/
    supabase/             # Supabase clients
    qr/                   # QR generation utilities
    security/             # URL validation, rate limiting
    utils.ts              # Utility functions
  types/                  # TypeScript types
  validations/            # Zod schemas

supabase/
  migrations/             # Database migrations
```

## Database Schema

All QR-related tables are under the `qr_code` schema:

- `qr_code.codes` - Main QR code records
- `qr_code.styles` - QR styling configuration
- `qr_code.assets` - Generated assets (SVG, PNG, PDF)
- `qr_code.scan_events` - Analytics data
- `qr_code.audit_log` - Change history

## Security

- **URL Validation**: SSRF prevention, protocol validation, private IP blocking
- **Rate Limiting**: Per-user and per-IP limits on all endpoints
- **Row Level Security**: Users can only access their own QR codes
- **Input Validation**: All inputs validated with Zod schemas

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | Yes |
| `QR_REDIRECT_BASE_URL` | Base URL for redirects | Yes |
| `IP_HASH_SALT` | Salt for IP hashing | Yes |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | No |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | No |

## Deployment

### Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy

### Custom Domain

For managed links to work with a custom domain:

1. Add your domain in Vercel
2. Update `NEXT_PUBLIC_APP_URL` and `QR_REDIRECT_BASE_URL`
3. Redeploy

## API Reference

### Create QR Code

```http
POST /api/qr
Content-Type: application/json

{
  "name": "Menu QR",
  "mode": "managed",
  "destination_url": "https://example.com/menu",
  "analytics_enabled": true
}
```

### Update QR Code

```http
PATCH /api/qr/{id}
Content-Type: application/json

{
  "destination_url": "https://example.com/new-menu"
}
```

### List QR Codes

```http
GET /api/qr
```

### Delete QR Code

```http
DELETE /api/qr/{id}
```

## License

Proprietary - OneSign & Digital

## Support

For issues and feature requests, please contact OneSign & Digital support.
