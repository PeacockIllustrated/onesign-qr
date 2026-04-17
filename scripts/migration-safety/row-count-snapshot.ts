import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const TABLES = [
  'qr_codes',
  'qr_styles',
  'qr_assets',
  'qr_scan_events',
  'qr_audit_log',
  'bio_link_pages',
  'bio_link_items',
  'bio_blocks',
  'bio_form_submissions',
  'bio_link_audit_log',
];

async function snapshot(outFile: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    );
  }

  const client = createClient(url, key, {
    auth: { persistSession: false },
  });

  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    const { count, error } = await client
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Failed to count ${table}: ${error.message}`);
      counts[table] = -1;
      continue;
    }
    counts[table] = count ?? 0;
    console.log(`${table}: ${counts[table]}`);
  }

  writeFileSync(
    outFile,
    JSON.stringify({ takenAt: new Date().toISOString(), counts }, null, 2)
  );
  console.log(`Snapshot written: ${outFile}`);
}

const outFile = process.argv[2];
if (!outFile) {
  console.error(
    'Usage: tsx scripts/migration-safety/row-count-snapshot.ts <output.json>'
  );
  process.exit(1);
}

snapshot(outFile).catch((err) => {
  console.error(err);
  process.exit(1);
});
