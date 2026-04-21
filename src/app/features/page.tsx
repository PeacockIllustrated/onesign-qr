import {
  Link as LinkIcon,
  QrCode,
  Users2,
  ShoppingBag,
  CheckCircle2,
  LayoutGrid,
  FormInput,
  Image as ImageIcon,
  Youtube,
  MapPin,
  CreditCard,
  Timer,
  Palette,
  FileDown,
  BarChart3,
  Infinity as InfinityIcon,
  UserPlus,
  ShieldCheck,
  Mail,
  Package,
  Printer,
  Zap,
} from 'lucide-react';

import { DarkShell } from '@/components/design/dark-shell';
import { Eyebrow } from '@/components/design/eyebrow';
import { Section } from '@/components/design/section';
import { CtaButton } from '@/components/design/cta-button';
import { MarketingNav } from '@/components/marketing/marketing-nav';
import { MarketingFooter } from '@/components/marketing/marketing-footer';

/* ─── Anchor nav ────────────────────────────────────────────────── */

const ANCHORS = [
  { href: '#bio-pages', label: 'Bio Pages' },
  { href: '#qr-codes', label: 'QR Codes' },
  { href: '#teams', label: 'Teams' },
  { href: '#shop', label: 'Shop' },
  { href: '#roadmap', label: 'Roadmap' },
];

/* ─── Feature bullet ────────────────────────────────────────────── */

interface BulletProps {
  icon: React.ReactNode;
  title: string;
  body: string;
}

function Bullet({ icon, title, body }: BulletProps) {
  return (
    <li className="flex gap-4">
      <span
        className="shrink-0 mt-0.5 flex items-center justify-center h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 text-lynx-400"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div>
        <p className="text-zinc-100 font-medium">{title}</p>
        <p className="text-sm text-zinc-500 leading-relaxed mt-0.5">{body}</p>
      </div>
    </li>
  );
}

function LightBullet({ icon, title, body }: BulletProps) {
  return (
    <li className="flex gap-4">
      <span
        className="shrink-0 mt-0.5 flex items-center justify-center h-9 w-9 rounded-lg bg-white border border-zinc-200 text-lynx-600"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div>
        <p className="text-zinc-900 font-medium">{title}</p>
        <p className="text-sm text-zinc-600 leading-relaxed mt-0.5">{body}</p>
      </div>
    </li>
  );
}

/* ─── Roadmap item ──────────────────────────────────────────────── */

interface RoadmapItemProps {
  tag: string;
  title: string;
  body: string;
}

function RoadmapItem({ tag, title, body }: RoadmapItemProps) {
  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
        {tag}
      </p>
      <p className="text-base text-zinc-200 font-medium leading-snug mb-1">
        {title}
      </p>
      <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function FeaturesPage() {
  return (
    <DarkShell>
      <MarketingNav />

      {/* ── Hero ────────────────────────────────────────────────── */}
      <DarkShell glow grid className="pt-16">
        <Section paddingClass="py-20 md:py-28">
          <div className="max-w-3xl">
            <Eyebrow className="mb-6">Features</Eyebrow>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] text-zinc-50">
              Every way to be <span className="text-lynx-400">found</span>.
            </h1>
            <p className="mt-6 text-lg text-zinc-400 leading-relaxed max-w-xl">
              A tour of what ships today, how the pieces fit together, and
              what&apos;s queued up next.
            </p>

            {/* Anchor nav */}
            <nav
              aria-label="Features sections"
              className="mt-10 flex flex-wrap items-center gap-2"
            >
              {ANCHORS.map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  className="text-xs font-medium tracking-wide uppercase px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-400 hover:text-lynx-400 hover:border-lynx-400/40 transition-colors"
                >
                  {a.label}
                </a>
              ))}
            </nav>
          </div>
        </Section>
      </DarkShell>

      {/* ── Bio Pages ───────────────────────────────────────────── */}
      <section
        id="bio-pages"
        className="border-t border-zinc-800 bg-zinc-950 py-20 md:py-24 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <Eyebrow className="mb-4">
                <LinkIcon
                  className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5"
                  aria-hidden="true"
                />
                Bio Pages
              </Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-4">
                A single link that carries your whole presence.
              </h2>
              <p className="text-zinc-400 leading-relaxed">
                Build a branded micro-site in minutes. Drag blocks, drop a
                template, share one link — no builders, no duct-tape
                integrations.
              </p>

              <ul className="mt-10 space-y-6">
                <Bullet
                  icon={<LayoutGrid className="h-5 w-5" aria-hidden="true" />}
                  title="Block editor"
                  body="Compose pages from links, text, images, galleries, forms, embeds, countdowns, and payment links."
                />
                <Bullet
                  icon={<Palette className="h-5 w-5" aria-hidden="true" />}
                  title="Ready-made templates"
                  body="Four starter templates — creator, business, event, portfolio — styled to ship, not to tweak."
                />
                <Bullet
                  icon={<FormInput className="h-5 w-5" aria-hidden="true" />}
                  title="Contact forms"
                  body="Collect enquiries straight into your inbox and a managed submission list. No third-party forms."
                />
                <Bullet
                  icon={<ImageIcon className="h-5 w-5" aria-hidden="true" />}
                  title="Image galleries"
                  body="Grid, carousel, and lightbox layouts. Uploads, reorder, captions — all handled."
                />
                <Bullet
                  icon={<Youtube className="h-5 w-5" aria-hidden="true" />}
                  title="Rich embeds"
                  body="YouTube, Spotify, and Google Maps embed inline with a single paste."
                />
                <Bullet
                  icon={<CreditCard className="h-5 w-5" aria-hidden="true" />}
                  title="Payment links + countdowns"
                  body="Drop Stripe payment links and time-boxed promos into any page block."
                />
              </ul>
            </div>

            {/* Mock panel */}
            <div
              aria-hidden="true"
              className="relative rounded-3xl border border-zinc-800 bg-zinc-900 p-6 md:p-8"
            >
              <div
                className="absolute inset-0 rounded-3xl opacity-40 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at top, rgba(88,163,134,0.18), transparent 60%)',
                }}
              />
              <div className="relative">
                <div className="mx-auto max-w-xs rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl">
                  <div className="h-20 bg-gradient-to-br from-lynx-500/30 via-lynx-500/10 to-transparent" />
                  <div className="px-5 pb-6 -mt-6">
                    <div className="h-12 w-12 rounded-full border-2 border-zinc-950 bg-zinc-800" />
                    <div className="mt-3">
                      <div className="h-3 w-28 rounded bg-zinc-700" />
                      <div className="mt-1.5 h-2 w-40 rounded bg-zinc-800" />
                    </div>
                    <div className="mt-5 space-y-2">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-9 rounded-lg border border-zinc-800 bg-zinc-900 flex items-center px-3"
                        >
                          <div className="h-2 w-20 rounded bg-zinc-700" />
                          <div className="ml-auto h-2 w-6 rounded bg-lynx-500/50" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="aspect-square rounded-md bg-zinc-800"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Managed QR Codes ────────────────────────────────────── */}
      <section
        id="qr-codes"
        className="border-t border-zinc-800 bg-zinc-900/40 py-20 md:py-24 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Mock first on this one for visual rhythm */}
            <div
              aria-hidden="true"
              className="order-2 lg:order-1 relative rounded-3xl border border-zinc-800 bg-zinc-900 p-8"
            >
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="h-40 w-40 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                  {/* Fake QR */}
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: 49 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-3 w-3 rounded-sm ${
                          [0, 1, 2, 6, 7, 8, 12, 13, 14, 20, 21, 27, 30, 34, 35, 36, 40, 41, 42, 45, 48].includes(i)
                            ? 'bg-lynx-400'
                            : 'bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest">
                    Managed · redirectable
                  </p>
                  <p className="mt-1 font-mono text-xs text-zinc-400">
                    /r/spring-menu-2026
                  </p>
                </div>
                <div className="w-full border-t border-zinc-800 my-2" />
                <div className="w-full grid grid-cols-3 gap-2 text-center">
                  {['SVG', 'PNG', 'PDF'].map((f) => (
                    <div
                      key={f}
                      className="rounded-md border border-zinc-800 bg-zinc-950 py-2 text-xs font-medium text-zinc-400"
                    >
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <Eyebrow className="mb-4">
                <QrCode
                  className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5"
                  aria-hidden="true"
                />
                Managed QR Codes
              </Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-4">
                Print once. Redirect anywhere. Forever.
              </h2>
              <p className="text-zinc-400 leading-relaxed">
                Every QR has a stable URL on your domain. Change where it
                points whenever you like — menus, campaigns, seasonal drops —
                without reprinting a single card.
              </p>

              <ul className="mt-10 space-y-6">
                <Bullet
                  icon={<Palette className="h-5 w-5" aria-hidden="true" />}
                  title="Custom styling"
                  body="Colour, module shape, frame, and logo embed. Stay on-brand across every surface."
                />
                <Bullet
                  icon={<FileDown className="h-5 w-5" aria-hidden="true" />}
                  title="SVG, PNG, PDF exports"
                  body="Vector for print, raster for web, print-ready PDF for your signage supplier."
                />
                <Bullet
                  icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
                  title="Scan analytics"
                  body="Sub-200ms redirects with anonymous, privacy-first scan counts per code."
                />
                <Bullet
                  icon={<Zap className="h-5 w-5" aria-hidden="true" />}
                  title="Stable, short URLs"
                  body="Every managed code lives at a memorable /r/&lt;slug&gt; path you can reuse in print and comms."
                />
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Teams (light section) ───────────────────────────────── */}
      <section
        id="teams"
        className="bg-zinc-50 border-y border-zinc-200 py-20 md:py-24 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <Eyebrow tone="light" className="mb-4">
                <Users2
                  className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5"
                  aria-hidden="true"
                />
                Team Accounts
              </Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 mb-4">
                Run a business, not a shared password.
              </h2>
              <p className="text-zinc-600 leading-relaxed">
                Multi-user organisations with role-based access. Invite
                colleagues, set permissions, keep ownership tidy.
              </p>

              <ul className="mt-10 space-y-6">
                <LightBullet
                  icon={<InfinityIcon className="h-5 w-5" aria-hidden="true" />}
                  title="Multi-user organisations"
                  body="Every customer has a personal org, plus as many team orgs as the business needs."
                />
                <LightBullet
                  icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
                  title="Role-based access"
                  body="Owner, admin, member. Permissions are enforced in the database with row-level security."
                />
                <LightBullet
                  icon={<UserPlus className="h-5 w-5" aria-hidden="true" />}
                  title="Email invitations"
                  body="Send token-based invites; accept on signup or from an existing account."
                />
                <LightBullet
                  icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
                  title="Review funnels (Pro)"
                  body="Route 5★ customers to Google, and catch 1–3★ feedback privately before it goes public."
                />
              </ul>
            </div>

            {/* Team mock — light variant */}
            <div
              aria-hidden="true"
              className="relative rounded-3xl border border-zinc-200 bg-white p-6 md:p-8 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)]"
            >
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
                Members
              </p>
              <div className="space-y-3">
                {[
                  { role: 'Owner', name: 'You', tint: 'lynx' },
                  { role: 'Admin', name: 'Colleague A', tint: 'zinc' },
                  { role: 'Member', name: 'Colleague B', tint: 'zinc' },
                  { role: 'Member', name: 'Invited…', tint: 'muted' },
                ].map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 bg-zinc-50"
                  >
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                        m.tint === 'lynx'
                          ? 'bg-lynx-100 text-lynx-700 border border-lynx-400/40'
                          : m.tint === 'muted'
                            ? 'bg-white text-zinc-400 border border-dashed border-zinc-300'
                            : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {m.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-900 font-medium truncate">
                        {m.name}
                      </p>
                      <p className="text-xs text-zinc-500">{m.role}</p>
                    </div>
                    {m.tint === 'muted' && (
                      <span className="text-[10px] uppercase tracking-wide text-zinc-500 border border-zinc-300 rounded px-2 py-0.5">
                        Pending
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Shop ────────────────────────────────────────────────── */}
      <section
        id="shop"
        className="bg-zinc-900/40 py-20 md:py-24 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <Eyebrow className="mb-4">
                <ShoppingBag
                  className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5"
                  aria-hidden="true"
                />
                Shop
              </Eyebrow>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-4">
                Merch that actually does something.
              </h2>
              <p className="text-zinc-400 leading-relaxed">
                Branded NFC cards, review boards, table talkers, magnetic van
                panels, A-frames — pre-programmed to your Lynx account.
                Printed in the UK and dispatched in 48 hours.
              </p>

              <ul className="mt-10 space-y-6">
                <Bullet
                  icon={<Package className="h-5 w-5" aria-hidden="true" />}
                  title="Pre-programmed NFC + QR"
                  body="Every product arrives linked to the bio page or QR code of your choice."
                />
                <Bullet
                  icon={<Printer className="h-5 w-5" aria-hidden="true" />}
                  title="UK-made"
                  body="Printed and fulfilled in the UK. 48-hour dispatch on in-stock items."
                />
                <Bullet
                  icon={<Timer className="h-5 w-5" aria-hidden="true" />}
                  title="One-off pricing"
                  body="Pay per product. No subscription, no tier required — independent of your plan."
                />
              </ul>

              <div className="mt-10">
                <CtaButton href="/shop" variant="secondary" size="md">
                  Browse the catalog →
                </CtaButton>
              </div>
            </div>

            {/* Shop thumbnails */}
            <div
              aria-label="Shop preview"
              className="grid grid-cols-2 gap-3"
            >
              {[
                { label: 'NFC Card', grad: '135deg, #1a1a1a 0%, #2d2d2d 40%, rgba(88,163,134,0.18) 100%' },
                { label: 'Review Board', grad: '135deg, #1c1c1c 0%, #303030 60%, rgba(88,163,134,0.12) 100%' },
                { label: 'Table Talker', grad: '135deg, #1a1a1a 0%, #2a2a2a 50%, rgba(88,163,134,0.14) 100%' },
                { label: 'Van Panel', grad: '135deg, #181818 0%, #2b2b2b 50%, rgba(88,163,134,0.16) 100%' },
              ].map((p, i) => (
                <div
                  key={p.label}
                  className={`aspect-[4/5] rounded-2xl overflow-hidden border border-zinc-800 ${
                    i % 2 === 1 ? 'translate-y-4' : ''
                  }`}
                >
                  <div
                    className="w-full h-full flex flex-col items-center justify-center p-4"
                    style={{ background: `linear-gradient(${p.grad})` }}
                  >
                    <div className="w-10 h-10 rounded-lg border border-lynx-400/30 mb-3" />
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
                      {p.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Roadmap ─────────────────────────────────────────────── */}
      <section
        id="roadmap"
        className="border-t border-zinc-800 bg-zinc-950 py-20 md:py-24 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <Eyebrow className="mb-4">On the way</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-3">
            What&apos;s queued up next.
          </h2>
          <p className="text-zinc-400 max-w-xl mb-12">
            We ship in visible slices. Here&apos;s what&apos;s close.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <RoadmapItem
              tag="Checkout"
              title="Stripe-powered payments"
              body="One-off payments for the shop so customers can order directly from your Lynx presence."
            />
            <RoadmapItem
              tag="Pricing tiers"
              title="Free and Pro"
              body="Custom domains, email signatures, and the review funnel block — unlocked on Pro."
            />
            <RoadmapItem
              tag="NFC mode"
              title="Write-once, redirect-anywhere"
              body="Managed NFC backed by the same redirect engine as your QR codes."
            />
            <RoadmapItem
              tag="Lead inbox"
              title="Unified enquiries view"
              body="Every form submission, across every bio page, funnelled into one inbox."
            />
            <RoadmapItem
              tag="Email signatures"
              title="On-brand team signatures"
              body="Generate branded signatures that stay consistent across the team."
            />
            <RoadmapItem
              tag="Business cards"
              title="Printed + NFC-programmed"
              body="Design and order branded business cards, pre-programmed to your bio page."
            />
          </div>
        </div>
      </section>

      {/* ── Closing CTA ─────────────────────────────────────────── */}
      <Section topRule paddingClass="py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-6">
            Ready to take your presence seriously?
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <CtaButton href="/auth/signup" variant="primary" size="lg">
              Get started — it&apos;s free
            </CtaButton>
            <CtaButton href="/pricing" variant="secondary" size="lg">
              Compare plans
            </CtaButton>
          </div>
          <p className="mt-5 text-sm text-zinc-600">
            <Mail className="inline h-3.5 w-3.5 mr-1 -mt-0.5" aria-hidden="true" />
            No credit card required · Set up in minutes
          </p>
        </div>
      </Section>

      <MarketingFooter />
    </DarkShell>
  );
}
