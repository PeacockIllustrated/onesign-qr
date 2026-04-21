'use client';

import { useRouter } from 'next/navigation';
import { InviteMemberForm } from '@/components/org/invite-member-form';

interface Member {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

interface Invite {
  id: string;
  email: string;
  role: 'admin' | 'member';
  expires_at: string;
  created_at: string;
}

function roleBadgeClass(role: Member['role'] | Invite['role']) {
  if (role === 'owner') {
    return 'bg-lynx-500/15 text-lynx-400 border border-lynx-400/30';
  }
  if (role === 'admin') {
    return 'bg-zinc-800 text-zinc-200 border border-zinc-700';
  }
  return 'bg-zinc-800/60 text-zinc-400 border border-zinc-800';
}

export function TeamSettings({
  myRole,
  members,
  invites,
}: {
  myRole: 'owner' | 'admin' | 'member';
  members: Member[];
  invites: Invite[];
}) {
  const router = useRouter();
  const canManage = myRole === 'owner' || myRole === 'admin';

  async function handleCancel(id: string) {
    const res = await fetch(`/api/org/invites/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Team</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage members, invites, and roles for this organisation.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Members ({members.length})
        </h2>
        <ul className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="p-4 text-sm flex items-center justify-between gap-4"
            >
              <span className="font-mono text-xs text-zinc-400 truncate">
                {m.user_id}
              </span>
              <span
                className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadgeClass(m.role)}`}
              >
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {canManage && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Invite a teammate
          </h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <InviteMemberForm onSent={() => router.refresh()} />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Pending invites ({invites.length})
        </h2>
        {invites.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
            <p className="text-sm text-zinc-500">No pending invites.</p>
          </div>
        ) : (
          <ul className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="p-4 text-sm flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-zinc-100 truncate">{inv.email}</div>
                  <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium capitalize ${roleBadgeClass(inv.role)}`}
                    >
                      {inv.role}
                    </span>
                    <span>
                      expires{' '}
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleCancel(inv.id)}
                    className="text-xs font-semibold text-destructive hover:text-destructive/80 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
