import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { acceptInviteTokenSchema } from '@/validations/invite';

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parse = acceptInviteTokenSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const { token } = parse.data;

  // Look up the invite.
  const { data: invite, error: lookupError } = await supabase
    .from('organization_invites')
    .select('id, org_id, email, role, expires_at, accepted_at')
    .eq('token', token)
    .single();

  if (lookupError || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  if (invite.accepted_at) {
    return NextResponse.json(
      { error: 'Invite already accepted' },
      { status: 410 }
    );
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
  }

  const userEmail = (user.email ?? '').toLowerCase();
  if (userEmail !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'Your account email does not match this invite' },
      { status: 403 }
    );
  }

  // Insert membership. PK (org_id, user_id) prevents double-accept under
  // concurrent requests.
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      org_id: invite.org_id,
      user_id: user.id,
      role: invite.role,
      invited_by: null,
    });

  // Treat unique_violation as success — caller may have accepted in another
  // tab. Still mark the invite accepted below.
  if (
    memberError &&
    (memberError as { code?: string }).code !== '23505'
  ) {
    console.error('[accept] member insert failed', memberError);
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    );
  }

  const { error: markError } = await supabase
    .from('organization_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  if (markError) {
    console.error('[accept] mark accepted failed', markError);
    // Membership is already created — surface partial success.
    return NextResponse.json(
      { orgId: invite.org_id, warning: 'Accepted but status not updated' },
      { status: 200 }
    );
  }

  return NextResponse.json({ orgId: invite.org_id });
}
