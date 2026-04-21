import { Flag, Zap, Nfc } from 'lucide-react';

import { DarkShell } from '@/components/design/dark-shell';
import { Eyebrow } from '@/components/design/eyebrow';
import { Section } from '@/components/design/section';
import { StatStrip } from '@/components/design/stat-strip';
import { CtaButton } from '@/components/design/cta-button';
import { MarketingNav } from '@/components/marketing/marketing-nav';
import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { createAdminClient } from '@/lib/supabase/admin';
import { PublicShopCatalog, type PublicProduct } from './public-shop-catalog';

export const metadata = {
  title: 'Shop — OneSign · Lynx',
  description:
    'Branded NFC cards, review boards, table talkers, magnetic van panels and A-frames. Pre-programmed to your Lynx account. UK-made, 48hr dispatch.',
};

const STAT_ITEMS = [
  {
    icon: <Flag className="h-3.5 w-3.5" aria-hidden="true" />,
    label: 'UK-made',
  },
  {
    icon: <Zap className="h-3.5 w-3.5" aria-hidden="true" />,
    label: '48hr dispatch',
  },
  {
    icon: <Nfc className="h-3.5 w-3.5" aria-hidden="true" />,
    label: 'NFC-enabled',
  },
];

export default async function PublicShopPage() {
  // Unauthenticated access — admin client bypasses RLS.
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('shop_products')
    .select(
      'id, slug, name, description, category, base_price_pence, primary_image_url'
    )
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const products = (data ?? []) as PublicProduct[];

  return (
    <DarkShell>
      <MarketingNav />

      {/* ── Hero ────────────────────────────────────────────────── */}
      <DarkShell glow grid className="pt-16">
        <Section paddingClass="py-20 md:py-28">
          <div className="max-w-3xl">
            <Eyebrow className="mb-6">Shop</Eyebrow>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] text-zinc-50">
              Merch that actually{' '}
              <span className="text-lynx-400">does something</span>.
            </h1>
            <p className="mt-6 text-lg text-zinc-400 leading-relaxed max-w-xl">
              Branded, QR/NFC-programmed physical products linked to your
              Lynx account. Printed in the UK and dispatched in 48 hours.
            </p>
          </div>
        </Section>
      </DarkShell>

      {/* ── Stat strip ──────────────────────────────────────────── */}
      <div className="bg-zinc-900 border-y border-zinc-800">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-5">
          <StatStrip items={STAT_ITEMS} />
        </div>
      </div>

      {/* ── Catalog ─────────────────────────────────────────────── */}
      <Section paddingClass="py-16 md:py-20">
        <ShopIntro productCount={products.length} />
        <PublicShopCatalog products={products} />
      </Section>

      {/* ── Closing CTA ─────────────────────────────────────────── */}
      <Section topRule paddingClass="py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-6">
            Create your Lynx account first.
          </h2>
          <p className="text-zinc-400 leading-relaxed mb-8">
            Every product is pre-programmed to a bio page or managed QR code
            on your account. Sign up free — no credit card required — and
            come back to the shop when you&apos;re ready.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <CtaButton href="/auth/signup" variant="primary" size="lg">
              Start free
            </CtaButton>
            <CtaButton href="/features" variant="secondary" size="lg">
              See features
            </CtaButton>
          </div>
        </div>
      </Section>

      <MarketingFooter />
    </DarkShell>
  );
}

function ShopIntro({ productCount }: { productCount: number }) {
  return (
    <div className="max-w-2xl mb-10 md:mb-12">
      <Eyebrow className="mb-4">Catalog</Eyebrow>
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-50 mb-3">
        {productCount > 0
          ? 'Carry your presence into the real world.'
          : 'The shop is being stocked.'}
      </h2>
      <p className="text-zinc-400 leading-relaxed">
        {productCount > 0
          ? 'Every product arrives linked to your Lynx bio page or managed QR code. Tap, scan, done.'
          : 'Our first products are arriving soon. Sign up free and we’ll notify you the moment they go live.'}
      </p>
    </div>
  );
}

export type { PublicProduct };
