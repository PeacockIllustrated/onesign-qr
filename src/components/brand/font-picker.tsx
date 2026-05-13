'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { Input, Label } from '@/components/ui';
import { FontLoader } from './font-loader';

interface GoogleFont {
  family: string;
  category: string;
  variants: string[];
}

interface FontPickerProps {
  label: string;
  value: string;
  onChange: (font: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  'sans-serif': 'Sans',
  serif: 'Serif',
  display: 'Display',
  handwriting: 'Script',
  monospace: 'Mono',
};

/**
 * Searchable Google Fonts picker.
 *
 * Fetches the full Google Fonts catalogue on mount (cached at module level so
 * the second instance doesn't refetch). The currently-selected font is loaded
 * via FontLoader so its preview line renders in the actual face. List items
 * render in their natural face once hovered (lazy load) — keeps the dropdown
 * lightweight while still being browseable.
 */
let fontsCache: GoogleFont[] | null = null;

export function FontPicker({ label, value, onChange }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [fonts, setFonts] = useState<GoogleFont[] | null>(fontsCache);
  const [hoveredFonts, setHoveredFonts] = useState<string[]>([value]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fontsCache) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY;
    if (!apiKey) {
      console.warn('NEXT_PUBLIC_GOOGLE_FONTS_API_KEY not set — font picker disabled');
      return;
    }
    fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.items)) {
          fontsCache = data.items as GoogleFont[];
          setFonts(fontsCache);
        }
      })
      .catch(() => undefined);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const filtered = useMemo(() => {
    if (!fonts) return [];
    const q = query.trim().toLowerCase();
    if (!q) return fonts.slice(0, 60);
    return fonts.filter((f) => f.family.toLowerCase().includes(q)).slice(0, 60);
  }, [fonts, query]);

  function pick(family: string) {
    onChange(family);
    setHoveredFonts((prev) => (prev.includes(family) ? prev : [...prev, family]));
    setOpen(false);
    setQuery('');
  }

  function lazyPreview(family: string) {
    setHoveredFonts((prev) => (prev.includes(family) ? prev : [...prev, family]));
  }

  return (
    <div className="space-y-1" ref={containerRef}>
      <Label className="text-xs">{label}</Label>
      {/* Load the currently-selected font for the trigger preview */}
      <FontLoader fonts={hoveredFonts.filter((f) => /^[A-Za-z0-9 ]+$/.test(f))} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full h-10 items-center justify-between rounded-sm border border-input bg-background px-3 text-sm hover:bg-accent/40 transition-colors"
      >
        <span style={{ fontFamily: `'${value}', system-ui` }}>{value}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="relative z-50">
          <div className="absolute left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
            <div className="p-2 border-b border-border flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={fonts ? `Search ${fonts.length} fonts…` : 'Loading…'}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto">
              {!fonts ? (
                <div className="p-4 text-xs text-muted-foreground text-center">Loading Google Fonts…</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground text-center">No fonts match &ldquo;{query}&rdquo;</div>
              ) : (
                filtered.map((f) => (
                  <button
                    key={f.family}
                    type="button"
                    onMouseEnter={() => lazyPreview(f.family)}
                    onClick={() => pick(f.family)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${
                      f.family === value ? 'bg-accent/60' : ''
                    }`}
                  >
                    <span style={{ fontFamily: `'${f.family}', system-ui` }} className="truncate">
                      {f.family}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {CATEGORY_LABELS[f.category] ?? f.category}
                    </span>
                  </button>
                ))
              )}
            </div>

            {fonts && filtered.length >= 60 && (
              <div className="px-3 py-2 border-t border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                Showing first 60 — refine search to see more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
