'use client';

import { useEffect } from 'react';

/**
 * Loads Google Fonts dynamically into the document head for the live preview.
 *
 * The PDF pipeline injects font links in the print HTML separately — this is
 * only for what the user sees in the design editor preview. We append one
 * <link> per unique font name (validated as alphanumeric + spaces to keep it
 * safe to interpolate into the URL).
 */
export function FontLoader({ fonts }: { fonts: string[] }) {
  useEffect(() => {
    const safe = Array.from(new Set(fonts))
      .filter((f) => /^[A-Za-z0-9 ]+$/.test(f));

    const created: HTMLLinkElement[] = [];
    for (const family of safe) {
      const id = `brand-font-${family.replace(/\s+/g, '-')}`;
      if (document.getElementById(id)) continue;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
      created.push(link);
    }

    return () => {
      for (const link of created) {
        link.parentElement?.removeChild(link);
      }
    };
  }, [fonts]);

  return null;
}
