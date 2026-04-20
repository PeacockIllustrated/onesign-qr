import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ACTIVE_ORG_COOKIE } from '@/lib/org/active-org';
import { TeamSettings } from '@/components/org/team-settings';

export default async function TeamSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  if (!activeOrgId) {
    return (
      <div className="p-6">
        <p>
          No active organisation. Please refresh or re-select from the org
          switcher.
        </p>
      </div>
    );
  }

  // My role in the active org — governs what UI to show.
  const { data: roleRow } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', activeOrgId)
    .eq('user_id', user.id)
    .single();

  const myRole = (roleRow?.role ?? 'member') as 'owner' | 'admin' | 'member';

  const { data: members } = await supabase
    .from('organization_members')
    .select('user_id, role, joined_at')
    .eq('org_id', activeOrgId)
    .order('joined_at', { ascending: true });

  const { data: invites } = await supabase
    .from('organization_invites')
    .select('id, email, role, expires_at, created_at')
    .eq('org_id', activeOrgId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  return (
    <div className="p-6">
      <TeamSettings
        myRole={myRole}
        members={members ?? []}
        invites={invites ?? []}
      />
    </div>
  );
}
