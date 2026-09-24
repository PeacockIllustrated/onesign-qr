import { describe, it, expect } from 'vitest';
import DOMPurify from 'isomorphic-dompurify';
import { traceMergedModulePath } from '@/lib/qr/merge-paths';
import { generateStyledSVG } from '@/lib/qr/svg-generator';
import { SVG_PURIFY_CONFIG } from '@/lib/security/svg-sanitizer';

type Grid = boolean[][];

function gridFrom(rows: string[]): Grid {
  return rows.map((r) => r.split('').map((c) => c === '#'));
}

/** Parse the M/H/V/Z path output into polygons */
function parsePolygons(d: string): [number, number][][] {
  const polys: [number, number][][] = [];
  const re = /([MHVZ])([^MHVZ]*)/g;
  let m: RegExpExecArray | null;
  let current: [number, number][] = [];
  let x = 0;
  let y = 0;
  while ((m = re.exec(d))) {
    const [, cmd, args] = m;
    if (cmd === 'M') {
      [x, y] = args.split(',').map(Number);
      current = [[x, y]];
    } else if (cmd === 'H') {
      x = Number(args);
      current.push([x, y]);
    } else if (cmd === 'V') {
      y = Number(args);
      current.push([x, y]);
    } else {
      polys.push(current);
    }
  }
  return polys;
}

/** Signed winding number of a point against all polygons (nonzero fill) */
function winding(polys: [number, number][][], px: number, py: number): number {
  let w = 0;
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      if (x1 !== x2) continue; // only vertical edges cross a horizontal ray
      if (x1 <= px) continue;
      if (py > Math.min(y1, y2) && py < Math.max(y1, y2)) w += y2 > y1 ? 1 : -1;
    }
  }
  return w;
}

function expectMatchesGrid(grid: Grid, d: string) {
  const polys = parsePolygons(d);
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const w = winding(polys, col + 0.5, row + 0.5);
      expect(w !== 0, `module ${row},${col}`).toBe(grid[row][col]);
      // No overlapping contours
      expect(Math.abs(w)).toBeLessThanOrEqual(1);
    }
  }
}

const trace = (grid: Grid) =>
  traceMergedModulePath(grid.length, (r, c) => grid[r][c], 0, 0, 1);

describe('traceMergedModulePath', () => {
  it('merges a horizontal run into one rectangle', () => {
    const d = trace(gridFrom(['###', '...', '...']));
    expect(d).toBe('M0,0H3V1H0Z');
  });

  it('merges an L-shape into a single six-corner outline', () => {
    const grid = gridFrom(['#..', '#..', '###']);
    const d = trace(grid);
    expect(d.match(/M/g)).toHaveLength(1);
    expect(parsePolygons(d)[0]).toHaveLength(6);
    expectMatchesGrid(grid, d);
  });

  it('keeps holes as separate reversed contours', () => {
    const grid = gridFrom(['###', '#.#', '###']);
    const d = trace(grid);
    expect(d.match(/M/g)).toHaveLength(2);
    expectMatchesGrid(grid, d);
  });

  it('keeps diagonally touching modules as separate shapes', () => {
    const grid = gridFrom(['#.', '.#']);
    const d = trace(grid);
    expect(d.match(/M/g)).toHaveLength(2);
    expectMatchesGrid(grid, d);
  });

  it('handles a checkerboard where every corner is a diagonal touch', () => {
    const grid = gridFrom(['#.#.#', '.#.#.', '#.#.#', '.#.#.', '#.#.#']);
    const d = trace(grid);
    expect(d.match(/M/g)).toHaveLength(13);
    expectMatchesGrid(grid, d);
  });

  it('reproduces random grids exactly', () => {
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let n = 0; n < 50; n++) {
      const size = 5 + (n % 20);
      const grid = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => rand() < 0.5)
      );
      expectMatchesGrid(grid, trace(grid));
    }
  });
});

describe('generateStyledSVG with square modules', () => {
  const base = {
    errorCorrection: 'M' as const,
    foregroundColor: '#000000',
    backgroundColor: '#FFFFFF',
    eyeShape: 'square' as const,
    quietZone: 4,
  };

  it('emits merged outlines rather than one square per module', async () => {
    const merged = await generateStyledSVG('https://example.com', { ...base, moduleShape: 'square' });
    const dots = await generateStyledSVG('https://example.com', { ...base, moduleShape: 'dots' });

    const pathD = (svg: string) =>
      [...svg.matchAll(/<path d="([^"]*)"/g)].map((m) => m[1]).join('');
    const subpaths = (svg: string) => (pathD(svg).match(/M/g) ?? []).length;

    expect(subpaths(merged)).toBeLessThan(subpaths(dots) / 2);
  });

  it('draws each eye as a single compound path that survives sanitizing', async () => {
    const svg = await generateStyledSVG('https://example.com', { ...base, moduleShape: 'square' });
    const clean = String(DOMPurify.sanitize(svg, SVG_PURIFY_CONFIG));
    expect(clean.match(/fill-rule="evenodd"/g)).toHaveLength(3);
  });
});
