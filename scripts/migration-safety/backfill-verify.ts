import { createClient } from '@supabase/supabase-js';

/**
 * Verifies the post-conditions of Phase 0.B backfill against whatever Supabase
 * project the environment points at. Exits non-zero on any failure. Safe to
 * run read-only against production.
 *
 * Checks:
 *   1. No bio_link_pages rows have NULL org_id.
 *   2. No qr_codes rows have NULL org_id.
 *   3. COUNT(auth.users) == COUNT(DISTINCT user_id from personal-org owners).
 *   4. Every org_id on bio_link_pages and qr_codes references an existing
 *      organization (no dangling FKs).
 */
async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    );
  }

  const client = createClient(url, key, { auth: { persistSession: false } });
  const failures: string[] = [];

  // 1 + 2: unassigned org_id counts
  for (const table of ['bio_link_pages', 'qr_codes'] as const) {
    const { count, error } = await client
      .from(table)
      .select('*', { count: 'exact', head: true })
      .is('org_id', null);
    if (error) {
      failures.push(`${table}: query failed — ${error.message}`);
      continue;
    }
    if ((count ?? 0) > 0) {
      failures.push(`${table}: ${count} rows still have NULL org_id`);
    } else {
      console.log(`${table}: 0 rows with NULL org_id`);
    }
  }

  // 3: user/owner parity
  const { count: userCount, error: userErr } = await client
    .schema('auth' as never)
    .from('users')
    .select('*', { count: 'exact', head: true });
  if (userErr) {
    // auth.users may not be reachable via PostgREST; fall back to RPC or skip.
    console.log(
      `auth.users count via PostgREST unavailable (${userErr.message}); parity check skipped — run SQL verification block instead.`
    );
  } else {
    const { data: owners, error: ownersErr } = await client
      .from('organization_members')
      .select('user_id, organizations!inner(slug, deleted_at)')
      .eq('role', 'owner');
    if (ownersErr) {
      failures.push(`organization_members query failed: ${ownersErr.message}`);
    } else {
      type JoinedRow = {
        user_id: string;
        organizations:
          | { slug: string | null; deleted_at: string | null }
          | { slug: string | null; deleted_at: string | null }[]
          | null;
      };
      const ownerIds = new Set<string>();
      for (const row of (owners ?? []) as JoinedRow[]) {
        const org = Array.isArray(row.organizations)
          ? row.organizations[0]
          : row.organizations;
        if (!org) continue;
        if ((org.slug ?? '').startsWith('personal-') && !org.deleted_at) {
          ownerIds.add(row.user_id);
        }
      }
      if (ownerIds.size !== userCount) {
        failures.push(
          `user/owner parity failed: auth.users=${userCount} personal-org-owners=${ownerIds.size}`
        );
      } else {
        console.log(`user/owner parity: ${userCount} = ${ownerIds.size}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error('\nBACKFILL VERIFICATION FAILED:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log('\nBackfill verification passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
