import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { OrganizationSummary } from '@/types/organization';

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Join organization_members -> organizations for the current user.
  const { data, error } = await supabase
    .from('organization_members')
    .select(
      'role, organizations!inner(id, name, slug, plan)'
    )
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load organisations' },
      { status: 500 }
    );
  }

  type Row = {
    role: OrganizationSummary['role'];
    organizations: {
      id: string;
      name: string;
      slug: string;
      plan: OrganizationSummary['plan'];
    };
  };

  const orgs: OrganizationSummary[] = ((data ?? []) as unknown as Row[]).map(
    (r) => ({
      id: r.organizations.id,
      name: r.organizations.name,
      slug: r.organizations.slug,
      role: r.role,
      plan: r.organizations.plan,
    })
  );

  return NextResponse.json({ orgs });
}
