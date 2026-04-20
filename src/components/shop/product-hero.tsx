'use client';

import { useState } from 'react';
import Image from 'next/image';
import { type ReactNode } from 'react';
import { SHOP_CATEGORY_LABELS } from '@/types/shop';
import type { ShopProductCategory } from '@/types/shop';

/* ─── Trust signal icons (inline SVG to avoid dependencies) ──── */

function UKMadeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="text-lynx-400/70"
    >
      <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 7h6M7 4v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function DispatchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="text-lynx-400/70"
    >
      <path
        d="M1 4.5h8a1 1 0 0 1 1 1v4.5H1V4.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M10 6.5h1.5L13 8.5V10h-3V6.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="3.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="10.5" cy="10.5" r="1" fill="currentColor" />
    </svg>
  );
}

function NfcIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="text-lynx-400/70"
    >
      <path
        d="M4 10.5C2.067 9.5 1 8.5 1 7s1.067-2.5 3-3.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M6 9c-.933-.667-1.5-1.333-1.5-2S5.067 5.667 6 5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="8" cy="7" r="1.25" fill="currentColor" />
      <path
        d="M10 9c.933-.667 1.5-1.333 1.5-2S10.933 5.667 10 5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─── Trust strip ─────────────────────────────────────────────── */

const TRUST_SIGNALS = [
  { icon: UKMadeIcon, label: 'UK-made', sub: 'Printed locally' },
  { icon: DispatchIcon, label: '48hr dispatch', sub: 'Typical lead time' },
  { icon: NfcIcon, label: 'NFC-enabled', sub: 'Tap-to-connect' },
] as const;

/* ─── How it works data ───────────────────────────────────────── */

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    heading: 'Generate your QR',
    body: 'Create a branded QR code or NFC profile in your Lynx dashboard — link it to your bio page, review form, or any URL.',
  },
  {
    step: '02',
    heading: 'Tag your product',
    body: 'Your physical product arrives with the NFC chip or QR code already configured. Stick it, display it, wear it.',
  },
  {
    step: '03',
    heading: 'Customer scans',
    body: 'One tap or scan takes them directly to your digital presence — no app download, no friction, just conversion.',
  },
] as const;

/* ─── Product image placeholder ──────────────────────────────── */

function ImagePlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
      <div className="relative w-20 h-20 opacity-30">
        <div className="absolute inset-0 border-2 border-lynx-400 rounded-xl rotate-6" />
        <div className="absolute inset-0 border-2 border-zinc-400 rounded-xl -rotate-3" />
        <div className="absolute inset-0 border-2 border-zinc-500 rounded-xl" />
      </div>
    </div>
  );
}

/* ─── Props ───────────────────────────────────────────────────── */

export interface ProductHeroProps {
  name: string;
  description: string | null;
  category: ShopProductCategory;
  primary_image_url: string | null;
  gallery_image_urls: string[] | null;
  children: ReactNode; // ComingSoonCta slot
}

/* ─── Component ───────────────────────────────────────────────── */

export function ProductHero({
  name,
  description,
  category,
  primary_image_url,
  gallery_image_urls,
  children,
}: ProductHeroProps) {
  const allImages = [
    ...(primary_image_url ? [primary_image_url] : []),
    ...(gallery_image_urls ?? []),
  ];
  const hasGallery = allImages.length > 1;

  const [activeImage, setActiveImage] = useState<string | null>(
    primary_image_url ?? (gallery_image_urls?.[0] ?? null)
  );

  const categoryLabel = SHOP_CATEGORY_LABELS[category];

  return (
    <>
      {/* ─── HERO SECTION ───────────────────────────────────────── */}
      <section
        className="relative overflow-hidden bg-zinc-900"
        aria-label={`${name} product detail`}
      >
        {/* Decorative grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
          aria-hidden="true"
        />
        {/* Ambient amber glow — mirrors catalog */}
        <div
          className="pointer-events-none absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full opacity-[0.12] blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(251,191,36,0.6) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 right-0 w-[360px] h-[360px] rounded-full opacity-[0.08] blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(251,191,36,0.5) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-5 md:px-8 pt-8 pb-16 md:pt-12 md:pb-24">
          {/* ── Two-column hero grid ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[55%_1fr] gap-10 lg:gap-14 items-start">

            {/* LEFT — Image column */}
            <div className="space-y-3">
              {/* Primary image */}
              <div className="relative aspect-[4/5] bg-zinc-800 rounded-2xl overflow-hidden border border-zinc-700/50 ring-1 ring-inset ring-white/5">
                {activeImage ? (
                  <Image
                    src={activeImage}
                    alt={name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <ImagePlaceholder />
                )}
              </div>

              {/* Gallery thumbnails — only if more than 1 image */}
              {hasGallery && (
                <div
                  className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none"
                  role="group"
                  aria-label="Product image gallery"
                >
                  {allImages.map((url, idx) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setActiveImage(url)}
                      aria-label={`View image ${idx + 1} of ${allImages.length}`}
                      aria-pressed={activeImage === url}
                      className={[
                        'relative flex-none w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
                        activeImage === url
                          ? 'border-lynx-400'
                          : 'border-zinc-700 hover:border-zinc-500',
                      ].join(' ')}
                    >
                      <Image
                        src={url}
                        alt={`${name}, image ${idx + 1}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT — Details column */}
            <div className="flex flex-col">
              {/* Category pill */}
              <span className="inline-flex items-center gap-1.5 self-start">
                <span className="w-1 h-1 rounded-full bg-lynx-400" aria-hidden="true" />
                <span className="text-xs tracking-widest uppercase text-lynx-400 font-semibold">
                  {categoryLabel}
                </span>
              </span>

              {/* Product name */}
              <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight text-zinc-50 leading-[1.05]">
                {name}
              </h1>

              {/* Description */}
              {description && (
                <p className="mt-4 text-base text-zinc-400 leading-relaxed">
                  {description}
                </p>
              )}

              {/* Trust signals strip */}
              <div
                className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3"
                aria-label="Product trust signals"
              >
                {TRUST_SIGNALS.map(({ icon: Icon, label, sub }, idx) => (
                  <div key={label} className="flex items-center gap-3">
                    {/* Amber dot separator */}
                    {idx > 0 && (
                      <span
                        className="w-1 h-1 rounded-full bg-lynx-400/40 flex-none"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex items-center gap-1.5">
                      <Icon />
                      <div className="flex flex-col leading-none">
                        <span className="text-xs font-semibold text-zinc-300">
                          {label}
                        </span>
                        <span className="text-[10px] text-zinc-600 mt-0.5">
                          {sub}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="mt-8 border-t border-zinc-800" aria-hidden="true" />

              {/* CTA slot — ComingSoonCta */}
              <div className="mt-8">{children}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────────── */}
      <section
        className="bg-zinc-800 border-y border-zinc-700/50"
        aria-labelledby="how-it-works-heading"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-14 md:py-20">
          {/* Section heading */}
          <div className="mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="inline-block w-5 h-px bg-lynx-400" aria-hidden="true" />
              <span className="text-lynx-400 text-xs font-semibold uppercase tracking-[0.2em]">
                The Lynx workflow
              </span>
            </div>
            <h2
              id="how-it-works-heading"
              className="text-2xl font-semibold text-zinc-50 tracking-tight"
            >
              How it works
            </h2>
          </div>

          {/* Steps — horizontal on desktop, vertical on mobile */}
          <ol
            className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10"
            aria-label="How it works steps"
          >
            {HOW_IT_WORKS_STEPS.map(({ step, heading, body }) => (
              <li key={step} className="flex flex-col">
                {/* Step number */}
                <span
                  className="text-4xl font-bold text-lynx-400/30 tabular-nums leading-none mb-4"
                  aria-hidden="true"
                >
                  {step}
                </span>
                {/* Connector line — desktop only */}
                <div
                  className="hidden md:block absolute"
                  aria-hidden="true"
                />
                <h3 className="text-base font-semibold text-zinc-100 mb-2">
                  {heading}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
