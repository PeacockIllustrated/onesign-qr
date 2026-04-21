import { Flag, Zap, Lock, Link, QrCode, Users2 } from 'lucide-react';

import { DarkShell } from '@/components/design/dark-shell';
import { Eyebrow } from '@/components/design/eyebrow';
import { Section } from '@/components/design/section';
import { StatStrip } from '@/components/design/stat-strip';
import { FeatureCard } from '@/components/design/feature-card';
import { CtaButton } from '@/components/design/cta-button';
import { MarketingNav } from '@/components/marketing/marketing-nav';
import { MarketingFooter } from '@/components/marketing/marketing-footer';

/* ─── Stat strip items ──────────────────────────────────────────── */

const STAT_ITEMS = [
  {
    icon: <Flag className="h-3.5 w-3.5" aria-hidden="true" />,
    label: 'UK-made merch',
  },
  {
    icon: <Zap className="h-3.5 w-3.5" aria-hidden="true" />,
    label: 'Sub-200ms redirects',
  },
  {
    icon: <Lock className="h-3.5 w-3.5" aria-hidden="true" />,
    label: 'No lock-in',
  },
];

/* ─── Page ──────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <DarkShell>
      {/* ── Navigation ──────────────────────────────────────────── */}
      <MarketingNav />

      {/* ── Hero ────────────────────────────────────────────────── */}
      <DarkShell glow grid className="pt-16">
        <Section paddingClass="py-24 md:py-36">
          <div className="max-w-3xl">
            <Eyebrow className="mb-6">OneSign · Lynx</Eyebrow>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-zinc-50">
              Your business.{' '}
              <br className="hidden sm:block" />
              One <span className="text-lynx-400">confident</span> presence.
            </h1>

            <p className="mt-6 text-lg md:text-xl text-zinc-400 leading-relaxed max-w-xl">
              Bio pages, managed QR codes, NFC merchandise, and review funnels
              — everything a UK business needs to show up, every time.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <CtaButton href="/auth/signup" variant="primary" size="lg">
                Get started
              </CtaButton>
              <CtaButton href="/features" variant="secondary" size="lg">
                See features
              </CtaButton>
            </div>
          </div>
        </Section>
      </DarkShell>

      {/* ── Stat strip ──────────────────────────────────────────── */}
      <div className="bg-zinc-900 border-y border-zinc-800">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-5">
          <StatStrip items={STAT_ITEMS} />
        </div>
      </div>

      {/* ── What you get ────────────────────────────────────────── */}
      <Section>
        <Eyebrow className="mb-4">What you get</Eyebrow>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-3">
          Everything in one place.
        </h2>
        <p className="text-zinc-400 max-w-xl mb-12">
          No five separate tools. No duct-tape integrations. One platform that
          handles every customer touchpoint.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard
            icon={<Link className="h-5 w-5" aria-hidden="true" />}
            title="Bio Pages"
            body="Multi-page link-in-bio with a block editor, ready-made templates, contact forms, galleries, and embeds."
            href="/features#bio-pages"
            linkLabel="Explore bio pages"
          />
          <FeatureCard
            icon={<QrCode className="h-5 w-5" aria-hidden="true" />}
            title="Managed QR Codes"
            body="Print once, redirect anywhere. Change destinations without reprinting. SVG/PNG/PDF export, scan analytics built-in."
            href="/features#qr-codes"
            linkLabel="See QR features"
          />
          <FeatureCard
            icon={<Users2 className="h-5 w-5" aria-hidden="true" />}
            title="Teams & Review Funnels"
            body="Invite your team with role-based access. Turn 5★ customers into Google reviews and catch 1–3★ feedback privately."
            href="/features#teams"
            linkLabel="Team accounts"
          />
        </div>
      </Section>

      {/* ── Shop teaser ─────────────────────────────────────────── */}
      <Section widthClass="max-w-5xl" topRule>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Left — pitch */}
          <div>
            <Eyebrow className="mb-4">Lynx merch</Eyebrow>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-4">
              Physical products that carry your presence.
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-8">
              Branded NFC cards, review boards, table talkers — pre-programmed
              and ready to place. Printed in the UK and dispatched in 48 hours.
            </p>
            <CtaButton href="/shop" variant="secondary" size="md">
              Shop the catalog →
            </CtaButton>
          </div>

          {/* Right — product thumbnail placeholders */}
          <div
            className="grid grid-cols-3 gap-3"
            aria-label="Product preview thumbnails"
          >
            <div
              className="aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900"
              aria-label="NFC card placeholder"
            >
              <div
                className="w-full h-full"
                style={{
                  background:
                    'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 40%, rgba(88,163,134,0.15) 100%)',
                }}
              >
                <div className="flex flex-col items-center justify-center h-full gap-2 p-3">
                  <div className="w-8 h-8 rounded-lg border border-lynx-400/30 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full border border-lynx-400/50" />
                  </div>
                  <span className="text-[9px] text-zinc-600 text-center font-medium tracking-wide uppercase">
                    NFC Card
                  </span>
                </div>
              </div>
            </div>

            <div
              className="aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 translate-y-3"
              aria-label="Review board placeholder"
            >
              <div
                className="w-full h-full"
                style={{
                  background:
                    'linear-gradient(135deg, #1c1c1c 0%, #303030 60%, rgba(88,163,134,0.1) 100%)',
                }}
              >
                <div className="flex flex-col items-center justify-center h-full gap-2 p-3">
                  <div className="w-8 h-8 rounded-lg border border-lynx-400/30 flex items-center justify-center">
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-1 h-1 rounded-full bg-lynx-400/40"
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[9px] text-zinc-600 text-center font-medium tracking-wide uppercase">
                    Review Board
                  </span>
                </div>
              </div>
            </div>

            <div
              className="aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900"
              aria-label="Table talker placeholder"
            >
              <div
                className="w-full h-full"
                style={{
                  background:
                    'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, rgba(88,163,134,0.12) 100%)',
                }}
              >
                <div className="flex flex-col items-center justify-center h-full gap-2 p-3">
                  <div className="w-8 h-8 rounded-lg border border-lynx-400/30 flex items-center justify-center">
                    <div className="w-4 h-0.5 bg-lynx-400/40 rounded-full" />
                  </div>
                  <span className="text-[9px] text-zinc-600 text-center font-medium tracking-wide uppercase">
                    Table Talker
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Roadmap strip ───────────────────────────────────────── */}
      <Section topRule>
        <Eyebrow className="mb-8">On the way</Eyebrow>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-2">
              Checkout
            </p>
            <p className="text-base text-zinc-300 font-medium leading-snug mb-1">
              Stripe-powered payments
            </p>
            <p className="text-sm text-zinc-600 leading-relaxed">
              One-off payments for the shop — so customers can order directly
              without leaving your Lynx presence.
            </p>
          </div>
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-2">
              Pricing tiers
            </p>
            <p className="text-base text-zinc-300 font-medium leading-snug mb-1">
              Free and Pro
            </p>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Custom domains, email signatures, and the review funnel block —
              unlocked on Pro.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Closing CTA ─────────────────────────────────────────── */}
      <Section topRule paddingClass="py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-6">
            Ready to take your business presence seriously?
          </h2>
          <CtaButton href="/auth/signup" variant="primary" size="lg">
            Get started — it&apos;s free
          </CtaButton>
          <p className="mt-5 text-sm text-zinc-600">
            No credit card required · Set up in minutes
          </p>
        </div>
      </Section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <MarketingFooter />
    </DarkShell>
  );
}
