import { readFileSync } from 'node:fs';

interface Row {
  id: string;
  slug: string;
  destination_url: string;
  is_active: boolean;
}

interface Snapshot {
  takenAt: string;
  rows: Row[];
}

function loadSnapshot(path: string): Snapshot {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as Snapshot;
}

function index(rows: Row[]): Map<string, Row> {
  const m = new Map<string, Row>();
  for (const r of rows) m.set(r.id, r);
  return m;
}

function diff(beforePath: string, afterPath: string): number {
  const before = loadSnapshot(beforePath);
  const after = loadSnapshot(afterPath);
  const b = index(before.rows);
  const a = index(after.rows);

  const removed: string[] = [];
  const added: string[] = [];
  const changed: string[] = [];

  for (const [id, row] of b) {
    const other = a.get(id);
    if (!other) {
      removed.push(id);
      continue;
    }
    if (
      other.slug !== row.slug ||
      other.destination_url !== row.destination_url ||
      other.is_active !== row.is_active
    ) {
      changed.push(id);
    }
  }
  for (const id of a.keys()) {
    if (!b.has(id)) added.push(id);
  }

  const totalIssues = removed.length + changed.length;

  console.log(`Before: ${before.rows.length} rows (${before.takenAt})`);
  console.log(`After:  ${after.rows.length} rows (${after.takenAt})`);
  console.log(`Added:   ${added.length}`);
  console.log(`Removed: ${removed.length}`);
  console.log(`Changed: ${changed.length}`);

  if (removed.length > 0) console.log('Removed IDs:', removed.slice(0, 20).join(', '));
  if (changed.length > 0) console.log('Changed IDs:', changed.slice(0, 20).join(', '));

  if (totalIssues > 0) {
    console.error(
      '\nSLUG INTEGRITY FAILURE: rows were removed or changed. ' +
        'This is a migration-critical problem for printed production QR codes.'
    );
    return 1;
  }

  console.log('\nSlug integrity OK.');
  return 0;
}

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error(
    'Usage: tsx scripts/migration-safety/slug-integrity-diff.ts <before.json> <after.json>'
  );
  process.exit(1);
}
process.exit(diff(beforePath, afterPath));
