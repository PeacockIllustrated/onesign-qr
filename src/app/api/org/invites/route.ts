import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ACTIVE_ORG_COOKIE } from '@/lib/org/active-org';
import { createInviteSchema } from '@/validations/invite';
import {
  generateInviteToken,
  INVITE_EXPIRY_SECONDS,
} from '@/lib/org/invite-tokens';
import { sendInviteEmail } from '@/lib/email/send-invite';

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  if (!activeOrgId) {
    return NextResponse.json(
      { error: 'No active organisation' },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parse = createInviteSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parse.error.flatten() },
      { status: 400 }
    );
  }

  // Caller must be owner or admin of the active org.
  const { data: roleRow } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', activeOrgId)
    .eq('user_id', user.id)
    .single();
  if (!roleRow || !['owner', 'admin'].includes(roleRow.role)) {
    return NextResponse.json(
      { error: 'Forbidden — owner or admin role required' },
      { status: 403 }
    );
  }

  const email = parse.data.email.toLowerCase();
  const role = parse.data.role;

  // FOLLOW-UP: check if this email is already a member of the org before
  // sending. Requires auth.users lookup by email via admin.auth.admin.listUsers
  // (filter support varies by SDK version). For now we skip this check — if
  // the invitee is already a member, /api/invite/accept handles the PK
  // conflict gracefully and they end up in a consistent state.
  // Option C (skip existing-member check) is intentional here. See design doc.

  const token = generateInviteToken();
  const expiresAt = new Date(
    Date.now() + INVITE_EXPIRY_SECONDS * 1000
  ).toISOString();

  const { data: invite, error: insertError } = await supabase
    .from('organization_invites')
    .insert({
      org_id: activeOrgId,
      email,
      role,
      token,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select('id, org_id, email, role, token, expires_at, created_at')
    .single();

  if (insertError) {
    if ((insertError as { code?: string }).code === '23505') {
      return NextResponse.json(
        { error: 'That email already has a pending invite' },
        { status: 409 }
      );
    }
    console.error('[invites POST] insert failed', insertError);
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    );
  }

  // Resolve org name for the email. Defaults gracefully if anything goes wrong.
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', activeOrgId)
    .single();

  const inviterName =
    ((user.user_metadata as Record<string, unknown> | undefined)?.full_name as
      | string
      | undefined) ||
    user.email?.split('@')[0] ||
    'A teammate';

  // Fire-and-forget email. Do not block the response on this.
  sendInviteEmail({
    to: email,
    orgName: org?.name ?? 'your team',
    inviterName,
    token,
  }).catch((err) => {
    console.error('[invites POST] email send failed', err);
  });

  return NextResponse.json(
    {
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at,
        created_at: invite.created_at,
      },
    },
    { status: 201 }
  );
}
