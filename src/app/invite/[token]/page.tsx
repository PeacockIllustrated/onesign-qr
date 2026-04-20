import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AcceptInviteButton } from '@/components/org/accept-invite-button';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  // Admin client so we can read the invite even if the user isn't a member
  // yet (they wouldn't match the RLS policy on invites by email match until
  // they sign in with that email).
  const admin = createAdminClient();
  const { data: invite, error } = await admin
    .from('organization_invites')
    .select(
      'id, org_id, email, role, expires_at, accepted_at, organizations!inner(name)'
    )
    .eq('token', token)
    .single();

  if (error || !invite) {
    return (
      <InviteShell>
        <h1 className="text-xl font-semibold">Invite not found</h1>
        <p>This invite link is invalid. Ask whoever sent it to resend.</p>
      </InviteShell>
    );
  }

  if (invite.accepted_at) {
    return (
      <InviteShell>
        <h1 className="text-xl font-semibold">Already accepted</h1>
        <p>
          This invite has already been used. If that wasn&rsquo;t you, contact
          your team.
        </p>
      </InviteShell>
    );
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return (
      <InviteShell>
        <h1 className="text-xl font-semibold">Invite expired</h1>
        <p>This invite has expired. Ask for a new one.</p>
      </InviteShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginParams = new URLSearchParams({
      next: `/invite/${token}`,
      invite_email: invite.email,
    });
    redirect(`/auth/login?${loginParams.toString()}`);
  }

  const emailMatches =
    (user.email ?? '').toLowerCase() === invite.email.toLowerCase();

  // Supabase returns embedded resources as arrays OR single objects depending
  // on the FK relationship and SDK version. Normalise to a single name.
  const orgsField = invite.organizations as
    | { name: string }
    | Array<{ name: string }>
    | null;
  const orgName = Array.isArray(orgsField)
    ? orgsField[0]?.name ?? 'an organisation'
    : orgsField?.name ?? 'an organisation';

  return (
    <InviteShell>
      <h1 className="text-xl font-semibold">Join {orgName}</h1>
      <p>
        You were invited as a <strong>{invite.role}</strong> to{' '}
        <strong>{orgName}</strong>.
      </p>
      {emailMatches ? (
        <AcceptInviteButton token={token} />
      ) : (
        <div className="space-y-2">
          <p>
            This invite is for <strong>{invite.email}</strong>, but you&rsquo;re
            signed in as <strong>{user.email}</strong>.
          </p>
          <p>Sign out and sign back in with the invited email to accept.</p>
        </div>
      )}
    </InviteShell>
  );
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6 space-y-4">
        {children}
      </div>
    </main>
  );
}
