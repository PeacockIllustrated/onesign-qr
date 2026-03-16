'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { FONT_CATALOG, FONT_CATEGORY_LABELS, buildFontPreviewUrl } from '@/lib/bio/fonts';
import type { FontCategory, FontEntry } from '@/lib/bio/fonts';
import { cn } from '@/lib/utils';

interface BioFontPickerProps {
  label: string;
  value: string;
  onChange: (family: string) => void;
}

// Track which fonts have been loaded globally to avoid duplicate <link> tags
const loadedFonts = new Set<string>();

function loadFontCSS(family: string) {
  if (loadedFonts.has(family)) return;
  loadedFonts.add(family);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = buildFontPreviewUrl(family);
  document.head.appendChild(link);
}

const CATEGORIES: FontCategory[] = ['sans', 'serif', 'display', 'handwriting', 'mono'];

/**
 * Individual font row that uses IntersectionObserver to load its font
 * CSS when scrolled into view, so each label renders in its own typeface.
 */
function FontRow({
  font,
  isSelected,
  onSelect,
}: {
  font: FontEntry;
  isSelected: boolean;
  onSelect: (family: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If already loaded, skip observer
    if (loadedFonts.has(font.family)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadFontCSS(font.family);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [font.family]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(font.family)}
      className={cn(
        'flex w-full items-center px-3 py-1.5 text-sm transition-colors',
        isSelected
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-muted/50'
      )}
    >
      <span style={{ fontFamily: `'${font.family}', sans-serif` }}>
        {font.label}
      </span>
    </button>
  );
}

export function BioFontPicker({ label, value, onChange }: BioFontPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load current font for display
  useEffect(() => {
    if (value) loadFontCSS(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Focus search when opened
  useEffect(() => {
    if (isOpen) {
      searchRef.current?.focus();
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (family: string) => {
      loadFontCSS(family);
      onChange(family);
      setIsOpen(false);
    },
    [onChange]
  );

  // Filter fonts by search
  const filtered = search
    ? FONT_CATALOG.filter((f) =>
        f.family.toLowerCase().includes(search.toLowerCase())
      )
    : FONT_CATALOG;

  // Group filtered fonts by category
  const grouped: Partial<Record<FontCategory, FontEntry[]>> = {};
  for (const font of filtered) {
    if (!grouped[font.category]) grouped[font.category] = [];
    grouped[font.category]!.push(font);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-sm font-medium">{label}</label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors',
          'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        <span style={{ fontFamily: `'${value}', sans-serif` }}>{value || 'Select font...'}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search fonts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Font list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">No fonts found</p>
            ) : (
              CATEGORIES.map((cat) => {
                const fonts = grouped[cat];
                if (!fonts || fonts.length === 0) return null;

                return (
                  <div key={cat}>
                    <div className="sticky top-0 bg-background/95 backdrop-blur-sm px-3 py-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {FONT_CATEGORY_LABELS[cat]}
                      </span>
                    </div>
                    {fonts.map((font) => (
                      <FontRow
                        key={font.family}
                        font={font}
                        isSelected={value === font.family}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
