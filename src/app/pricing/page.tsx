import { Check, X, Sparkles, ShoppingBag } from 'lucide-react';

import { DarkShell } from '@/components/design/dark-shell';
import { Eyebrow } from '@/components/design/eyebrow';
import { Section } from '@/components/design/section';
import { CtaButton } from '@/components/design/cta-button';
import { MarketingNav } from '@/components/marketing/marketing-nav';
import { MarketingFooter } from '@/components/marketing/marketing-footer';

/* ─── Feature matrix ────────────────────────────────────────────── */

interface Feature {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}

const FEATURES: Feature[] = [
  { label: 'Bio pages per organisation', free: 'Up to 5', pro: 'Unlimited' },
  { label: 'Managed QR codes', free: 'Unlimited', pro: 'Unlimited' },
  { label: 'Scan analytics', free: 'Basic', pro: 'Advanced' },
  { label: 'Contact forms', free: true, pro: true },
  { label: 'Image galleries + embeds', free: true, pro: true },
  { label: 'Payment link blocks', free: true, pro: true },
  { label: 'Team members per organisation', free: 'Up to 3', pro: 'Unlimited' },
  { label: 'Role-based access', free: true, pro: true },
  { label: 'Custom domain per bio page', free: false, pro: true },
  { label: 'Email signature generator', free: false, pro: true },
  { label: 'Review funnel block', free: false, pro: true },
  { label: 'Priority support', free: false, pro: true },
];

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <Check
        className="h-5 w-5 text-lynx-400 mx-auto"
        aria-label="Included"
      />
    );
  }
  if (value === false) {
    return (
      <X className="h-5 w-5 text-zinc-700 mx-auto" aria-label="Not included" />
    );
  }
  return <span className="text-sm text-zinc-300">{value}</span>;
}

/* ─── FAQ ───────────────────────────────────────────────────────── */

const FAQ = [
  {
    q: 'Can I switch from Free to Pro later?',
    a: 'Yes. Upgrade from any account at any time — the Pro upgrade flow ships with the next release. Your existing bio pages, QR codes, and team setup all carry across.',
  },
  {
    q: 'Do I need Pro to buy from the shop?',
    a: "No. Shop purchases are one-off and independent of your plan. NFC cards, review boards, table talkers, van panels, and A-frames are all available to Free accounts.",
  },
  {
    q: 'What about custom domains?',
    a: 'Custom domains per bio page are a Pro feature. Free accounts live on your Lynx subdomain at /p/<slug>.',
  },
  {
    q: 'How does team billing work?',
    a: 'Billed per organisation, not per member. One Pro subscription covers unlimited members in that org. Multi-org billing arrives with the pricing tier rollout.',
  },
  {
    q: 'Is there a contract or minimum term?',
    a: "No. Pro is month-to-month. Cancel anytime — your pages and QR codes stay live on Free, just with Pro features disabled.",
  },
  {
    q: 'What is Lynx built on?',
    a: 'Next.js, Supabase, and a UK-based CDN. Redirects resolve in under 200ms, wherever your customers scan.',
  },
];

/* ─── Page ──────────────────────────────────────────────────────── */

export default function PricingPage() {
  return (
    <DarkShell>
      <MarketingNav />

      {/* ── Hero ────────────────────────────────────────────────── */}
      <DarkShell glow grid className="pt-16">
        <Section paddingClass="py-20 md:py-28">
          <div className="max-w-3xl">
            <Eyebrow className="mb-6">Pricing</Eyebrow>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] text-zinc-50">
              Start free.{' '}
              <span className="text-lynx-400">Upgrade</span> when it pays for
              itself.
            </h1>
            <p className="mt-6 text-lg text-zinc-400 leading-relaxed max-w-xl">
              Two plans. No per-seat tax. Shop purchases are always one-off —
              independent of your plan.
            </p>
          </div>
        </Section>
      </DarkShell>

      {/* ── Plan cards ──────────────────────────────────────────── */}
      <Section paddingClass="pt-8 pb-16 md:pt-12 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl mx-auto">
          {/* Free */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 flex flex-col">
            <div className="mb-8">
              <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                Free
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight text-zinc-50">
                  £0
                </span>
                <span className="text-zinc-500 text-sm">/ forever</span>
              </div>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Everything a small business needs to show up online. No time
                limit, no credit card.
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Up to 5 bio pages per organisation',
                'Unlimited managed QR codes',
                'Basic scan analytics',
                'Contact forms + galleries + embeds',
                'Team accounts (up to 3 members)',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                  <Check
                    className="h-4 w-4 text-lynx-400 mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <CtaButton href="/auth/signup" variant="secondary" size="lg">
              Start free
            </CtaButton>
          </div>

          {/* Pro */}
          <div className="relative rounded-2xl border border-lynx-400/40 bg-zinc-900 p-8 flex flex-col">
            {/* Recommended badge */}
            <div className="absolute -top-3 left-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-lynx-500 text-zinc-950 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Recommended
              </span>
            </div>

            {/* Soft glow */}
            <div
              className="absolute inset-0 rounded-2xl opacity-40 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at top, rgba(88,163,134,0.15), transparent 60%)',
              }}
              aria-hidden="true"
            />

            <div className="relative mb-8">
              <p className="text-sm font-semibold text-lynx-400 uppercase tracking-widest mb-3">
                Pro
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight text-zinc-50">
                  £12
                </span>
                <span className="text-zinc-500 text-sm">/ month · per org</span>
              </div>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                For businesses that want custom domains, unlimited team
                members, and the review funnel block.
              </p>
            </div>

            <ul className="relative space-y-3 mb-8 flex-1">
              {[
                'Everything in Free',
                'Custom domain per bio page',
                'Unlimited team members',
                'Email signature generator',
                'Review funnel block (5★ → Google)',
                'Priority support',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-200">
                  <Check
                    className="h-4 w-4 text-lynx-400 mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="relative">
              <CtaButton
                href="/auth/signup?plan=pro"
                variant="primary"
                size="lg"
              >
                Get Pro
              </CtaButton>
              <p className="mt-3 text-xs text-zinc-500 text-center">
                Upgrade to Pro from any account — coming with the next release.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Feature comparison ──────────────────────────────────── */}
      <Section topRule>
        <Eyebrow className="mb-4">Side-by-side</Eyebrow>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-12">
          Every feature, in one table.
        </h2>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th
                    scope="col"
                    className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-6 py-4 w-1/2"
                  >
                    Feature
                  </th>
                  <th
                    scope="col"
                    className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-6 py-4 text-center"
                  >
                    Free
                  </th>
                  <th
                    scope="col"
                    className="text-xs font-semibold text-lynx-400 uppercase tracking-widest px-6 py-4 text-center"
                  >
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((row, i) => (
                  <tr
                    key={row.label}
                    className={
                      i < FEATURES.length - 1 ? 'border-b border-zinc-800/60' : ''
                    }
                  >
                    <td className="text-sm text-zinc-300 px-6 py-4">
                      {row.label}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <CellValue value={row.free} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <CellValue value={row.pro} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ── Physical merch strip ────────────────────────────────── */}
      <Section widthClass="max-w-5xl" topRule paddingClass="py-14 md:py-16">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
          <div className="shrink-0 h-12 w-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-lynx-400">
            <ShoppingBag className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
              Physical merch
            </p>
            <h3 className="text-lg font-semibold text-zinc-100 mb-1">
              Shop purchases are one-off — independent of your plan.
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              NFC cards, review boards, table talkers, magnetic van panels,
              and A-frames. Buy whenever — Free or Pro, same prices.
            </p>
          </div>
          <div className="shrink-0">
            <CtaButton href="/shop" variant="secondary" size="md">
              Browse catalog →
            </CtaButton>
          </div>
        </div>
      </Section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <Section topRule>
        <div className="max-w-3xl">
          <Eyebrow className="mb-4">FAQ</Eyebrow>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-12">
            Common questions.
          </h2>

          <dl className="space-y-8">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="border-b border-zinc-800 pb-8 last:border-0 last:pb-0"
              >
                <dt className="text-lg font-semibold text-zinc-100 mb-3">
                  {item.q}
                </dt>
                <dd className="text-sm md:text-base text-zinc-400 leading-relaxed">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {/* ── Closing CTA ─────────────────────────────────────────── */}
      <Section topRule paddingClass="py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-6">
            Start free today. Upgrade when you&apos;re ready.
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <CtaButton href="/auth/signup" variant="primary" size="lg">
              Start free
            </CtaButton>
            <CtaButton href="/features" variant="secondary" size="lg">
              See every feature
            </CtaButton>
          </div>
          <p className="mt-5 text-sm text-zinc-600">
            No credit card required · Set up in minutes
          </p>
        </div>
      </Section>

      <MarketingFooter />
    </DarkShell>
  );
}
