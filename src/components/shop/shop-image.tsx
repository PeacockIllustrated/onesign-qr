'use client';

import { useState } from 'react';

/**
 * Product image with graceful fallback.
 *
 * Admin-entered URLs aren't whitelisted by next.config's remotePatterns, so
 * next/image rejects anything that isn't /storage/v1/object/public/** on a
 * *.supabase.co host — leaving alt text bleeding into the card. This uses a
 * plain <img> with onError so any failure (blocked host, 404, broken URL)
 * falls back to the geometric placeholder.
 */
export function ShopImage({
  src,
  alt,
  className = 'absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105',
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-2 border-zinc-700 rounded-lg rotate-6" />
          <div className="absolute inset-0 border-2 border-zinc-600 rounded-lg -rotate-3" />
          <div className="absolute inset-0 border-2 border-lynx-400/50 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className={className}
    />
  );
}
