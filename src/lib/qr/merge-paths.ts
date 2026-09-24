/**
 * Merge adjacent square QR modules into single outline paths.
 *
 * Instead of emitting one square per dark module (which leaves hundreds of
 * overlapping/abutting shapes that have to be united by hand in Illustrator),
 * this traces the outer contour of every connected region of dark modules and
 * emits only the corner points. Holes are traced in the opposite direction so
 * the result fills correctly under both the nonzero and evenodd fill rules.
 */

type Point = [number, number];

/**
 * Trace merged outlines for a grid of square modules.
 *
 * @param size - Number of modules per side
 * @param isDark - Returns true if the module at (row, col) should be filled
 * @param offsetX - X position of module (0, 0)
 * @param offsetY - Y position of module (0, 0)
 * @param moduleSize - Size of one module in SVG units
 * @returns SVG path data (one closed subpath per contour)
 */
export function traceMergedModulePath(
  size: number,
  isDark: (row: number, col: number) => boolean,
  offsetX: number,
  offsetY: number,
  moduleSize: number
): string {
  const filled = (row: number, col: number) =>
    row >= 0 && col >= 0 && row < size && col < size && isDark(row, col);

  // Collect boundary edges between a filled and an unfilled cell, directed so
  // the filled cell is always on the right-hand side (clockwise in screen
  // coordinates). Keyed by start vertex; a vertex can have at most two
  // outgoing edges (where two filled cells touch diagonally).
  const edges = new Map<string, Point[]>();
  let edgeCount = 0;
  const key = (x: number, y: number) => `${x},${y}`;
  const addEdge = (x1: number, y1: number, x2: number, y2: number) => {
    const k = key(x1, y1);
    const list = edges.get(k);
    if (list) list.push([x2, y2]);
    else edges.set(k, [[x2, y2]]);
    edgeCount++;
  };

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!filled(row, col)) continue;
      const x = col;
      const y = row;
      if (!filled(row - 1, col)) addEdge(x, y, x + 1, y); // top
      if (!filled(row, col + 1)) addEdge(x + 1, y, x + 1, y + 1); // right
      if (!filled(row + 1, col)) addEdge(x + 1, y + 1, x, y + 1); // bottom
      if (!filled(row, col - 1)) addEdge(x, y + 1, x, y); // left
    }
  }

  // Pick the outgoing edge from a vertex. At a diagonal touch there are two;
  // turn right (towards the filled cell) so diagonally touching regions stay
  // as separate shapes rather than being pinched into one.
  const chooseEdge = (from: Point, prevDir: Point): number => {
    const list = edges.get(key(from[0], from[1]));
    if (!list || list.length === 0) return -1;
    if (list.length === 1) return 0;
    const right: Point = [-prevDir[1], prevDir[0]];
    const found = list.findIndex(
      ([nx, ny]) => nx - from[0] === right[0] && ny - from[1] === right[1]
    );
    return found >= 0 ? found : 0;
  };

  const removeEdge = (from: Point, index: number): Point => {
    const k = key(from[0], from[1]);
    const list = edges.get(k)!;
    const [next] = list.splice(index, 1);
    if (list.length === 0) edges.delete(k);
    edgeCount--;
    return next;
  };

  const fmt = (n: number) => Number(n.toFixed(4)).toString();
  const subpaths: string[] = [];

  while (edgeCount > 0) {
    const startKey = edges.keys().next().value as string;
    const [sx, sy] = startKey.split(',').map(Number);
    const start: Point = [sx, sy];
    const startEdge = edges.get(startKey)![0];

    // Walk the loop, recording the vertices where direction changes. The
    // start edge stays in the map until the walk comes back round to it, so
    // the loop closes on the edge the turn rule actually pairs with it.
    const corners: Point[] = [start];
    const firstDir: Point = [startEdge[0] - sx, startEdge[1] - sy];
    let dir: Point = firstDir;
    let current: Point = startEdge;

    for (;;) {
      const index = chooseEdge(current, dir);
      if (index < 0) break; // Should not happen for a closed contour
      const atStart = current[0] === sx && current[1] === sy;
      const candidate = edges.get(key(current[0], current[1]))![index];
      if (atStart && candidate === startEdge) {
        removeEdge(start, index);
        break;
      }
      const next = removeEdge(current, index);
      const newDir: Point = [next[0] - current[0], next[1] - current[1]];
      if (dir[0] !== newDir[0] || dir[1] !== newDir[1]) corners.push(current);
      dir = newDir;
      current = next;
    }

    // The start point is only a corner if the closing edge changes direction.
    if (dir[0] === firstDir[0] && dir[1] === firstDir[1]) corners.shift();

    if (corners.length < 3) continue;

    const toX = (x: number) => fmt(offsetX + x * moduleSize);
    const toY = (y: number) => fmt(offsetY + y * moduleSize);
    let d = `M${toX(corners[0][0])},${toY(corners[0][1])}`;
    for (let i = 1; i < corners.length; i++) {
      const [px, py] = corners[i - 1];
      const [cx, cy] = corners[i];
      d += px === cx ? `V${toY(cy)}` : `H${toX(cx)}`;
    }
    subpaths.push(`${d}Z`);
  }

  return subpaths.join('');
}
