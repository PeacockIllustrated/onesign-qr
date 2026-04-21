'use client';

import { useState } from 'react';
import { Button, Input, Label, Select } from '@/components/ui';

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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="sarah@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-role">Role</Label>
        <Select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </Select>
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? 'Sending…' : 'Send invite'}
      </Button>
      {message && (
        <p
          className={`text-sm ${
            message.type === 'error' ? 'text-destructive' : 'text-lynx-400'
          }`}
          role="status"
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
