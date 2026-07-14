import { describe, it, expect } from 'vitest';
import {
  buildCircleFrame,
  buildRadialFrame,
  escapeXml,
  RADIAL_RING_COUNT,
} from '@/lib/qr/frames';
import { generateStyledSVG } from '@/lib/qr/svg-generator';

const QR_CANVAS = 370; // e.g. a 29-module matrix + 4-module quiet zone at moduleSize 10
const MODULE = 10;
const FRAGMENT = '<path d="M10,10h10v10h-10Z" fill="#000000"/>';

// The clear disc must fully contain the quiet-zone SQUARE: its radius is the
// square's half-diagonal. Anything less would let the frame intrude on the
// matrix / quiet zone and hurt scanning.
const HALF_DIAGONAL = (QR_CANVAS / 2) * Math.SQRT2;

function circleOpts(label?: string) {
  return {
    qrFragment: FRAGMENT,
    qrCanvasSize: QR_CANVAS,
    moduleSize: MODULE,
    ringColor: '#000000',
    backgroundColor: '#FFFFFF',
    labelColor: '#FFFFFF',
    label,
  };
}

function radialOpts(label?: string, seed = 'https://example.com/r/abcd') {
  return {
    qrFragment: FRAGMENT,
    qrCanvasSize: QR_CANVAS,
    moduleSize: MODULE,
    ringColor: '#111111',
    backgroundColor: '#FFFFFF',
    labelColor: '#111111',
    label,
    seed,
  };
}

/** Extract { r, strokeWidth } for every dashed ring (the fill="none" circles). */
function ringCircles(content: string): Array<{ r: number; strokeWidth: number }> {
  return content
    .split('\n')
    .filter((line) => line.includes('<circle') && line.includes('fill="none"'))
    .map((line) => ({
      r: Number(/ r="([\d.]+)"/.exec(line)?.[1]),
      strokeWidth: Number(/stroke-width="([\d.]+)"/.exec(line)?.[1]),
    }));
}

describe('escapeXml', () => {
  it('escapes XML-significant characters', () => {
    expect(escapeXml('A & B < C > "D" \'E\'')).toBe(
      'A &amp; B &lt; C &gt; &quot;D&quot; &apos;E&apos;'
    );
  });
});

describe('buildCircleFrame', () => {
  it('keeps the clear disc large enough to contain the quiet-zone square', () => {
    const { geometry } = buildCircleFrame(circleOpts());
    expect(geometry.innerRadius).toBeGreaterThanOrEqual(HALF_DIAGONAL - 1e-6);
  });

  it('embeds the intact QR fragment verbatim and grows the canvas', () => {
    const { content, size } = buildCircleFrame(circleOpts());
    expect(content).toContain(FRAGMENT);
    expect(size).toBeGreaterThan(QR_CANVAS);
  });

  it('omits label markup when there is no label', () => {
    const { content } = buildCircleFrame(circleOpts());
    expect(content).not.toContain('<text');
  });

  it('renders a curved label when provided', () => {
    const { content } = buildCircleFrame(circleOpts('SCAN ME'));
    expect(content).toContain('<text');
    expect(content).toContain('<textPath');
    expect(content).toContain('SCAN ME');
  });

  it('escapes labels to keep the SVG well-formed', () => {
    const { content } = buildCircleFrame(circleOpts('Tom & Co <b>'));
    expect(content).toContain('Tom &amp; Co &lt;b&gt;');
    expect(content).not.toContain('<b>');
  });
});

describe('buildRadialFrame', () => {
  it('keeps the clear disc large enough to contain the quiet-zone square', () => {
    const { geometry } = buildRadialFrame(radialOpts());
    expect(geometry.innerRadius).toBeGreaterThanOrEqual(HALF_DIAGONAL - 1e-6);
    expect(geometry.discRadius).toBeGreaterThan(geometry.innerRadius);
    expect(geometry.ringCount).toBe(RADIAL_RING_COUNT);
  });

  it('draws exactly RADIAL_RING_COUNT dashed rings', () => {
    const rings = ringCircles(buildRadialFrame(radialOpts()).content);
    expect(rings).toHaveLength(RADIAL_RING_COUNT);
  });

  it('SCANNABILITY: no ring (incl. stroke width) intrudes on the clear disc', () => {
    const { content, geometry } = buildRadialFrame(radialOpts('SCAN ME'));
    for (const ring of ringCircles(content)) {
      expect(ring.r - ring.strokeWidth / 2).toBeGreaterThan(geometry.innerRadius);
    }
  });

  it('embeds the intact QR fragment verbatim', () => {
    expect(buildRadialFrame(radialOpts()).content).toContain(FRAGMENT);
  });

  it('is deterministic for a given seed', () => {
    expect(buildRadialFrame(radialOpts(undefined, 'seed-a')).content).toBe(
      buildRadialFrame(radialOpts(undefined, 'seed-a')).content
    );
  });

  it('produces different ring patterns for different seeds', () => {
    expect(buildRadialFrame(radialOpts(undefined, 'seed-a')).content).not.toBe(
      buildRadialFrame(radialOpts(undefined, 'seed-b')).content
    );
  });

  it('renders a curved label when provided', () => {
    const { content } = buildRadialFrame(radialOpts('ORDER HERE'));
    expect(content).toContain('<text');
    expect(content).toContain('ORDER HERE');
  });
});

describe('generateStyledSVG frames (integration)', () => {
  const data = 'https://onesignanddigital.com/r/abcd1234';
  const base = {
    errorCorrection: 'Q' as const,
    foregroundColor: '#3355ff',
    backgroundColor: '#FFFFFF',
    moduleShape: 'square' as const,
    eyeShape: 'square' as const,
    quietZone: 4,
  };

  function moduleD(svg: string): string {
    // The single dark data-module path (finder eyes are rects for square eyes).
    const m = /<path d="([^"]+)" fill="#3355ff"\/>/.exec(svg);
    return m?.[1] ?? '';
  }

  function viewBoxSize(svg: string): number {
    const m = /viewBox="0 0 ([\d.]+) /.exec(svg);
    return Number(m?.[1]);
  }

  it('preserves the exact data-module matrix inside a circle frame', async () => {
    const plain = await generateStyledSVG(data, { ...base, frameShape: 'none' });
    const circle = await generateStyledSVG(data, { ...base, frameShape: 'circle' });
    const d = moduleD(plain);
    expect(d.length).toBeGreaterThan(0);
    expect(circle).toContain(d);
    expect(viewBoxSize(circle)).toBeGreaterThan(viewBoxSize(plain));
  });

  it('preserves the exact data-module matrix inside a radial frame', async () => {
    const plain = await generateStyledSVG(data, { ...base, frameShape: 'none' });
    const radial = await generateStyledSVG(data, { ...base, frameShape: 'radial' });
    expect(radial).toContain(moduleD(plain));
    expect(viewBoxSize(radial)).toBeGreaterThan(viewBoxSize(plain));
  });

  it('includes the call-to-action label in framed output', async () => {
    const circle = await generateStyledSVG(data, { ...base, frameShape: 'circle', frameLabel: 'SCAN ME' });
    expect(circle).toContain('SCAN ME');
  });
});
