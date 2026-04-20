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
    <div className="max-w-2xl space-y-8">
      <section>
        <h2 className="text-xl font-semibold mb-3">
          Members ({members.length})
        </h2>
        <ul className="divide-y border rounded">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="p-3 text-sm flex justify-between"
            >
              <span className="font-mono text-xs text-gray-600 truncate">
                {m.user_id}
              </span>
              <span className="text-gray-600">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      {canManage && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Invite a teammate</h2>
          <InviteMemberForm onSent={() => router.refresh()} />
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">
          Pending invites ({invites.length})
        </h2>
        {invites.length === 0 ? (
          <p className="text-sm text-gray-500">No pending invites.</p>
        ) : (
          <ul className="divide-y border rounded">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="p-3 text-sm flex justify-between items-center"
              >
                <div>
                  <div>{inv.email}</div>
                  <div className="text-xs text-gray-500">
                    {inv.role} · expires{' '}
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </div>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleCancel(inv.id)}
                    className="text-xs text-red-600 hover:underline"
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
