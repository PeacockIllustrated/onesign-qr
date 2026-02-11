/**
 * Curated Google Fonts catalog for bio-link page customization.
 *
 * Fonts are grouped by category. Each entry includes family name, category,
 * available weights, and a display label. The catalog is intentionally small
 * (~60 fonts) to keep the picker manageable and load times fast.
 */

export type FontCategory = 'sans' | 'serif' | 'display' | 'handwriting' | 'mono';

export interface FontEntry {
  family: string;
  category: FontCategory;
  weights: number[];
  label: string;
}

export const FONT_CATALOG: FontEntry[] = [
  // ─── Sans-Serif ──────────────────────────────
  { family: 'Inter', category: 'sans', weights: [400, 500, 600, 700], label: 'Inter' },
  { family: 'DM Sans', category: 'sans', weights: [400, 500, 700], label: 'DM Sans' },
  { family: 'Outfit', category: 'sans', weights: [400, 500, 600, 700], label: 'Outfit' },
  { family: 'Nunito', category: 'sans', weights: [400, 600, 700, 800], label: 'Nunito' },
  { family: 'Quicksand', category: 'sans', weights: [400, 500, 600, 700], label: 'Quicksand' },
  { family: 'Barlow', category: 'sans', weights: [400, 500, 600, 700], label: 'Barlow' },
  { family: 'Lato', category: 'sans', weights: [400, 700], label: 'Lato' },
  { family: 'Poppins', category: 'sans', weights: [400, 500, 600, 700], label: 'Poppins' },
  { family: 'Raleway', category: 'sans', weights: [400, 500, 600, 700], label: 'Raleway' },
  { family: 'Montserrat', category: 'sans', weights: [400, 500, 600, 700], label: 'Montserrat' },
  { family: 'Open Sans', category: 'sans', weights: [400, 600, 700], label: 'Open Sans' },
  { family: 'Source Sans 3', category: 'sans', weights: [400, 600, 700], label: 'Source Sans' },
  { family: 'Work Sans', category: 'sans', weights: [400, 500, 600, 700], label: 'Work Sans' },
  { family: 'Manrope', category: 'sans', weights: [400, 500, 600, 700, 800], label: 'Manrope' },
  { family: 'Plus Jakarta Sans', category: 'sans', weights: [400, 500, 600, 700, 800], label: 'Jakarta Sans' },
  { family: 'Sora', category: 'sans', weights: [400, 500, 600, 700], label: 'Sora' },

  // ─── Serif ───────────────────────────────────
  { family: 'Playfair Display', category: 'serif', weights: [400, 700], label: 'Playfair Display' },
  { family: 'Libre Baskerville', category: 'serif', weights: [400, 700], label: 'Libre Baskerville' },
  { family: 'Merriweather', category: 'serif', weights: [400, 700], label: 'Merriweather' },
  { family: 'Lora', category: 'serif', weights: [400, 500, 600, 700], label: 'Lora' },
  { family: 'PT Serif', category: 'serif', weights: [400, 700], label: 'PT Serif' },
  { family: 'Crimson Text', category: 'serif', weights: [400, 600, 700], label: 'Crimson Text' },
  { family: 'Cormorant Garamond', category: 'serif', weights: [400, 500, 600, 700], label: 'Cormorant' },
  { family: 'DM Serif Display', category: 'serif', weights: [400], label: 'DM Serif Display' },
  { family: 'Fraunces', category: 'serif', weights: [400, 500, 600, 700], label: 'Fraunces' },

  // ─── Display ─────────────────────────────────
  { family: 'Bebas Neue', category: 'display', weights: [400], label: 'Bebas Neue' },
  { family: 'Space Grotesk', category: 'display', weights: [400, 500, 600, 700], label: 'Space Grotesk' },
  { family: 'Orbitron', category: 'display', weights: [400, 500, 600, 700], label: 'Orbitron' },
  { family: 'Righteous', category: 'display', weights: [400], label: 'Righteous' },
  { family: 'Fredoka', category: 'display', weights: [400, 500, 600, 700], label: 'Fredoka' },
  { family: 'Rubik', category: 'display', weights: [400, 500, 600, 700], label: 'Rubik' },
  { family: 'Comfortaa', category: 'display', weights: [400, 500, 600, 700], label: 'Comfortaa' },
  { family: 'Lexend', category: 'display', weights: [400, 500, 600, 700], label: 'Lexend' },
  { family: 'Archivo Black', category: 'display', weights: [400], label: 'Archivo Black' },
  { family: 'Titan One', category: 'display', weights: [400], label: 'Titan One' },
  { family: 'Bungee', category: 'display', weights: [400], label: 'Bungee' },

  // ─── Handwriting ─────────────────────────────
  { family: 'Caveat', category: 'handwriting', weights: [400, 500, 600, 700], label: 'Caveat' },
  { family: 'Pacifico', category: 'handwriting', weights: [400], label: 'Pacifico' },
  { family: 'Dancing Script', category: 'handwriting', weights: [400, 500, 600, 700], label: 'Dancing Script' },
  { family: 'Permanent Marker', category: 'handwriting', weights: [400], label: 'Permanent Marker' },
  { family: 'Satisfy', category: 'handwriting', weights: [400], label: 'Satisfy' },
  { family: 'Kalam', category: 'handwriting', weights: [400, 700], label: 'Kalam' },
  { family: 'Indie Flower', category: 'handwriting', weights: [400], label: 'Indie Flower' },
  { family: 'Shadows Into Light', category: 'handwriting', weights: [400], label: 'Shadows Into Light' },

  // ─── Monospace ───────────────────────────────
  { family: 'Roboto Mono', category: 'mono', weights: [400, 500, 700], label: 'Roboto Mono' },
  { family: 'Space Mono', category: 'mono', weights: [400, 700], label: 'Space Mono' },
  { family: 'JetBrains Mono', category: 'mono', weights: [400, 500, 700], label: 'JetBrains Mono' },
  { family: 'Fira Code', category: 'mono', weights: [400, 500, 600, 700], label: 'Fira Code' },
  { family: 'Source Code Pro', category: 'mono', weights: [400, 500, 600, 700], label: 'Source Code Pro' },
  { family: 'VT323', category: 'mono', weights: [400], label: 'VT323' },
  { family: 'Silkscreen', category: 'mono', weights: [400, 700], label: 'Silkscreen' },
  { family: 'Exo 2', category: 'mono', weights: [400, 500, 600, 700], label: 'Exo 2' },
];

/** Category labels for UI grouping */
export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  sans: 'Sans Serif',
  serif: 'Serif',
  display: 'Display',
  handwriting: 'Handwriting',
  mono: 'Monospace',
};

/** Get fonts grouped by category for the font picker */
export function getFontsByCategory(): Record<FontCategory, FontEntry[]> {
  const grouped: Record<FontCategory, FontEntry[]> = {
    sans: [],
    serif: [],
    display: [],
    handwriting: [],
    mono: [],
  };

  for (const font of FONT_CATALOG) {
    grouped[font.category].push(font);
  }

  return grouped;
}

/** Find a font entry by family name */
export function findFont(family: string): FontEntry | undefined {
  return FONT_CATALOG.find((f) => f.family === family);
}

/**
 * Build a Google Fonts URL for previewing a single font in the editor.
 * Used for dynamically loading fonts when the user picks one.
 */
export function buildFontPreviewUrl(family: string, weights?: number[]): string {
  const w = weights?.join(';') || '400;700';
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${w}&display=swap`;
}
