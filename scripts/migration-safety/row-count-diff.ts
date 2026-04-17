import { readFileSync } from 'node:fs';

interface Snapshot {
  takenAt: string;
  counts: Record<string, number>;
}

function load(path: string): Snapshot {
  return JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
}

function diff(beforePath: string, afterPath: string): number {
  const before = load(beforePath);
  const after = load(afterPath);
  const mismatches: string[] = [];

  for (const table of Object.keys(before.counts)) {
    const b = before.counts[table];
    const a = after.counts[table] ?? null;
    if (a === null) {
      mismatches.push(`${table}: missing from after snapshot`);
      continue;
    }
    if (b !== a) {
      mismatches.push(`${table}: before=${b} after=${a} delta=${a - b}`);
    }
  }

  console.log(`Before: ${before.takenAt}`);
  console.log(`After:  ${after.takenAt}`);

  if (mismatches.length > 0) {
    console.error('\nROW COUNT MISMATCH:');
    for (const m of mismatches) console.error(`  - ${m}`);
    return 1;
  }

  console.log('Row counts match. No data loss detected.');
  return 0;
}

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error(
    'Usage: tsx scripts/migration-safety/row-count-diff.ts <before.json> <after.json>'
  );
  process.exit(1);
}
process.exit(diff(beforePath, afterPath));
