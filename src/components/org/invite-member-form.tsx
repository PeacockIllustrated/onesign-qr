'use client';

import { useState } from 'react';

export function InviteMemberForm({ onSent }: { onSent: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<
    { type: 'error' | 'success'; text: string } | null
  >(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/org/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, role }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setMessage({
          type: 'error',
          text: json.error ?? 'Failed to send invite',
        });
        return;
      }
      setMessage({ type: 'success', text: `Invite sent to ${email}` });
      setEmail('');
      setRole('member');
      onSent();
    } catch {
      setMessage({ type: 'error', text: 'Failed to send invite' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium" htmlFor="invite-email">
          Email
        </label>
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="sarah@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="invite-role">
          Role
        </label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
      >
        {busy ? 'Sending…' : 'Send invite'}
      </button>
      {message && (
        <p
          className={
            message.type === 'error'
              ? 'text-sm text-red-600'
              : 'text-sm text-green-600'
          }
          role="status"
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
