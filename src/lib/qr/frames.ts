/**
 * Circular frame ("circle QR code") rendering.
 *
 * Design rationale — how a scannable circle QR code works:
 * A QR code's data matrix is defined by ISO/IEC 18004 as a SQUARE grid of
 * modules with three finder patterns in the corners. Cameras locate those
 * finder/timing patterns and read the square grid — they never read the outer
 * boundary shape. A "circle QR code" is therefore NOT a matrix bent into a
 * circle (clipping the corners would destroy modules and break scanning).
 * It is the standard, fully-intact square matrix centred inside a circular
 * badge, with a colored ring and (optionally) a curved call-to-action label.
 *
 * This module only ever ADDS decoration OUTSIDE a clear circle that fully
 * contains the matrix plus its quiet zone, so scannability is preserved by
 * construction. See the tests in __tests__/lib/qr/frames.test.ts.
 */

import type { FrameShape } from './shapes';
import { FRAME_LABEL_MAX_LENGTH } from '@/lib/constants';

export type { FrameShape };
export { FRAME_LABEL_MAX_LENGTH };

export interface CircleFrameOptions {
  /**
   * The inner QR content (finder patterns, module path, logo) as an SVG
   * fragment. Its coordinates live inside a square of side `qrCanvasSize`.
   */
  qrFragment: string;
  /** Side length of the square QR canvas (matrix + quiet zone), in SVG units. */
  qrCanvasSize: number;
  /** One module in SVG units, used for proportional sizing. */
  moduleSize: number;
  /** Ring color (defaults to the QR foreground). */
  ringColor: string;
  /** Center/quiet-zone color the matrix sits on (the QR background). */
  backgroundColor: string;
  /** Color of the curved label text (defaults to the background so it reads on the ring). */
  labelColor: string;
  /** Optional call-to-action text rendered along the bottom arc, e.g. "SCAN ME". */
  label?: string;
}

export interface CircleFrameResult {
  /** Full inner SVG content: ring, center, centred matrix, and label. */
  content: string;
  /** Side length of the (square) badge viewBox that wraps the circle. */
  size: number;
  /** Geometry, exposed for tests and downstream callers. */
  geometry: {
    center: number;
    innerRadius: number;
    outerRadius: number;
    band: number;
  };
}

/** Escape a string for safe inclusion in SVG/XML text content. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Wrap an already-built square QR fragment in a circular badge.
 *
 * The white inner circle is sized to fully contain the quiet-zone square
 * (radius = half-diagonal of the QR canvas), so the ISO quiet zone is never
 * encroached and the matrix is never clipped.
 */
export function buildCircleFrame(options: CircleFrameOptions): CircleFrameResult {
  const {
    qrFragment,
    qrCanvasSize,
    moduleSize,
    ringColor,
    backgroundColor,
    labelColor,
    label,
  } = options;

  const half = qrCanvasSize / 2;

  // Inner clear circle contains the whole quiet-zone square: its radius is the
  // square's half-diagonal. This guarantees the matrix + quiet zone are never
  // touched by the ring.
  const innerRadius = half * Math.SQRT2;

  const trimmedLabel = label?.trim() ?? '';
  const hasLabel = trimmedLabel.length > 0;

  // The ring is thicker when it has to carry a label.
  const band = hasLabel
    ? Math.max(moduleSize * 2.6, qrCanvasSize * 0.12)
    : Math.max(moduleSize * 1.1, qrCanvasSize * 0.045);

  const outerRadius = innerRadius + band;
  const pad = moduleSize * 0.6; // breathing room so the ring is not flush to the edge
  const size = 2 * (outerRadius + pad);
  const center = size / 2;

  // Offset that centres the QR canvas (coords in [0, qrCanvasSize]) in the badge.
  const offset = center - half;

  const parts: string[] = [];

  // Colored ring base, then the clear center the matrix sits on.
  parts.push(
    `<circle cx="${round(center)}" cy="${round(center)}" r="${round(outerRadius)}" fill="${ringColor}"/>`
  );
  parts.push(
    `<circle cx="${round(center)}" cy="${round(center)}" r="${round(innerRadius)}" fill="${backgroundColor}"/>`
  );

  // The intact square matrix, centred.
  parts.push(`<g transform="translate(${round(offset)},${round(offset)})">${qrFragment}</g>`);

  // Optional curved call-to-action along the bottom arc. The arc id is derived
  // from the QR content so multiple framed codes can coexist on one page
  // without their <textPath> references colliding.
  if (hasLabel) {
    const arcId = `qr-frame-arc-${hash(qrFragment + trimmedLabel)}`;
    parts.push(
      buildCurvedLabel(trimmedLabel, center, innerRadius + band / 2, band, moduleSize, labelColor, arcId)
    );
  }

  return {
    content: parts.join('\n  '),
    size,
    geometry: { center, innerRadius, outerRadius, band },
  };
}

export interface RadialFrameOptions {
  /** The inner QR content (finder patterns, module path, logo) as an SVG fragment. */
  qrFragment: string;
  /** Side length of the square QR canvas (matrix + quiet zone), in SVG units. */
  qrCanvasSize: number;
  /** One module in SVG units, used for proportional sizing. */
  moduleSize: number;
  /** Colour of the rings (defaults to the QR foreground). */
  ringColor: string;
  /** Disc colour behind the code and rings (the QR background). */
  backgroundColor: string;
  /** Colour of the curved label — pass the foreground so it reads on the disc. */
  labelColor: string;
  /** Optional call-to-action rendered curved below the rings. */
  label?: string;
  /** Seed (typically the encoded data) so each code's ring pattern is unique but stable. */
  seed: string;
}

export interface RadialFrameResult {
  content: string;
  size: number;
  geometry: { center: number; innerRadius: number; discRadius: number; ringCount: number };
}

/** How many concentric dashed rings the radial ("signal") frame draws. */
export const RADIAL_RING_COUNT = 6;

/**
 * Wrap an intact square QR in concentric two-tone dashed rings — an App
 * Clip-inspired "signal" badge.
 *
 * IMPORTANT: this is decoration only. The rings encode nothing; the square
 * matrix in the centre is the real, scannable QR. The rings live entirely
 * OUTSIDE the clear disc that contains the matrix + quiet zone, so scanning is
 * never affected. Ring geometry is seeded from the encoded data so every code
 * looks distinct yet renders identically each time (stable exports).
 */
export function buildRadialFrame(options: RadialFrameOptions): RadialFrameResult {
  const {
    qrFragment,
    qrCanvasSize,
    moduleSize,
    ringColor,
    backgroundColor,
    labelColor,
    label,
    seed,
  } = options;

  const half = qrCanvasSize / 2;
  // Clear disc that fully contains the quiet-zone square (its half-diagonal).
  const innerRadius = half * Math.SQRT2;

  const trimmedLabel = label?.trim() ?? '';
  const hasLabel = trimmedLabel.length > 0;

  const gap = moduleSize * 1.4; // clear space between the QR core and the first ring
  const step = moduleSize * 1.7; // radial spacing between rings
  const ringsInner = innerRadius + gap;
  const ringsOuter = ringsInner + step * RADIAL_RING_COUNT;

  const labelGap = hasLabel ? moduleSize * 0.8 : 0;
  const labelBand = hasLabel ? Math.max(moduleSize * 2.2, qrCanvasSize * 0.1) : 0;

  // The disc covers everything so the code, rings and label sit on one known,
  // high-contrast field — reliable scanning on any printed surface.
  const discRadius = ringsOuter + labelGap + labelBand + moduleSize * 0.5;
  const pad = moduleSize * 0.6;
  const size = 2 * (discRadius + pad);
  const center = size / 2;
  const offset = center - half;

  const rng = mulberry32(hash32(seed || qrFragment));

  const parts: string[] = [];

  parts.push(
    `<circle cx="${round(center)}" cy="${round(center)}" r="${round(discRadius)}" fill="${backgroundColor}"/>`
  );

  // Concentric dashed rings. Each ring's density, dash length, weight, tone and
  // rotation vary (seeded) to evoke the organic App Clip "burst".
  for (let k = 0; k < RADIAL_RING_COUNT; k++) {
    const r = ringsInner + step * (k + 0.5);
    const circumference = 2 * Math.PI * r;

    const segments = Math.round(randRange(rng, 20, 46));
    const unit = circumference / segments; // dashes tile evenly → no visible seam
    const dashFraction = randRange(rng, 0.42, 0.72);
    const dash = unit * dashFraction;
    const gapLen = unit - dash;
    const strokeWidth = randRange(rng, moduleSize * 0.5, moduleSize * 0.92);
    const rotation = randRange(rng, 0, 360);
    const opacity = rng() < 0.45 ? 0.4 : 1; // two-tone: full weight + a muted tint

    parts.push(
      `<circle cx="${round(center)}" cy="${round(center)}" r="${round(r)}" fill="none" ` +
        `stroke="${ringColor}" stroke-opacity="${round(opacity)}" stroke-width="${round(strokeWidth)}" ` +
        `stroke-linecap="round" stroke-dasharray="${round(dash)} ${round(gapLen)}" ` +
        `transform="rotate(${round(rotation)} ${round(center)} ${round(center)})"/>`
    );
  }

  // The intact square matrix, centred — this is the scannable payload.
  parts.push(`<g transform="translate(${round(offset)},${round(offset)})">${qrFragment}</g>`);

  if (hasLabel) {
    const arcId = `qr-frame-arc-${hash(qrFragment + trimmedLabel)}`;
    const textRadius = ringsOuter + labelGap + labelBand / 2;
    parts.push(
      buildCurvedLabel(trimmedLabel, center, textRadius, labelBand, moduleSize, labelColor, arcId)
    );
  }

  return {
    content: parts.join('\n  '),
    size,
    geometry: { center, innerRadius, discRadius, ringCount: RADIAL_RING_COUNT },
  };
}

/**
 * Build a curved <text> that sits centred on the bottom of the ring, upright.
 *
 * The arc is drawn left→right along the LOWER semicircle (sweep-flag 0), so the
 * text baseline follows the arc and glyphs stand upright and read normally.
 */
function buildCurvedLabel(
  label: string,
  center: number,
  textRadius: number,
  fontBand: number,
  moduleSize: number,
  color: string,
  arcId: string
): string {
  // Fit the font both within the band height and along the available arc.
  const arcLength = Math.PI * textRadius; // bottom semicircle
  const maxByBand = fontBand * 0.6;
  const maxByArc = arcLength / Math.max(label.length, 1) / 0.62; // ~0.62 em per glyph
  const fontSize = clamp(Math.min(maxByBand, maxByArc), moduleSize * 0.8, fontBand * 0.7);

  const letterSpacing = fontSize * 0.06;

  const startX = round(center - textRadius);
  const endX = round(center + textRadius);
  const cy = round(center);

  // Lower semicircle, left→right (sweep-flag 0), so glyphs stand upright.
  const path = `M ${startX} ${cy} A ${round(textRadius)} ${round(textRadius)} 0 0 0 ${endX} ${cy}`;

  return [
    `<defs><path id="${arcId}" d="${path}" fill="none"/></defs>`,
    `<text fill="${color}" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="${round(fontSize)}" font-weight="700" letter-spacing="${round(letterSpacing)}">`,
    `<textPath href="#${arcId}" startOffset="50%">${escapeXml(label)}</textPath>`,
    `</text>`,
  ].join('');
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Small deterministic djb2 hash → uint32. */
function hash32(value: string): number {
  let h = 5381;
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) + h + value.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** djb2 hash → base36, for unique-but-stable element ids. */
function hash(value: string): string {
  return hash32(value).toString(36);
}

/** Deterministic mulberry32 PRNG seeded from a uint32. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
