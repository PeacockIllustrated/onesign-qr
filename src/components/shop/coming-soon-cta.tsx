interface ComingSoonCtaProps {
  pricePence: number;
}

export function ComingSoonCta({ pricePence }: ComingSoonCtaProps) {
  const price = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pricePence / 100);

  return (
    <div>
      {/* Price */}
      <div
        className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-50 tabular-nums"
        aria-label={`Price: ${price}`}
      >
        {price}
      </div>

      {/* Disabled buy button */}
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="mt-4 w-full bg-zinc-700 text-zinc-500 py-3.5 rounded-xl text-sm font-semibold cursor-not-allowed select-none border border-zinc-600/50"
      >
        Checkout coming soon
      </button>

      {/* Footnote */}
      <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
        Payments go live with the next release. Want a test order?{' '}
        <a
          href="mailto:hello@onesignanddigital.com"
          className="text-lynx-400 underline underline-offset-2 hover:text-lynx-300 transition-colors"
        >
          hello@onesignanddigital.com
        </a>
      </p>
    </div>
  );
}
