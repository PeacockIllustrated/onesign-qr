import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

interface QrRow {
  id: string;
  slug: string;
  destination_url: string;
  is_active: boolean;
}

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

  const rows: QrRow[] = [];
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await client
      .from('qr_codes')
      .select('id, slug, destination_url, is_active')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...(data as QrRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  rows.sort((a, b) => a.id.localeCompare(b.id));

  writeFileSync(
    outFile,
    JSON.stringify({ takenAt: new Date().toISOString(), rows }, null, 2)
  );

  console.log(`Snapshot written: ${outFile} (${rows.length} rows)`);
}

const outFile = process.argv[2];
if (!outFile) {
  console.error(
    'Usage: tsx scripts/migration-safety/slug-integrity-snapshot.ts <output-file.json>'
  );
  process.exit(1);
}

snapshot(outFile).catch((err) => {
  console.error(err);
  process.exit(1);
});
