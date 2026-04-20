'use client';

import { useState } from 'react';

export function AcceptInviteButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(json.error ?? 'Failed to accept');
        return;
      }
      const { orgId } = (await res.json()) as { orgId: string };

      // Switch the active-org cookie to the new org so /app reflects it.
      await fetch('/api/org/switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ orgId }),
      }).catch(() => undefined);

      window.location.href = '/app';
    } catch {
      setError('Failed to accept');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="w-full bg-black text-white py-2 px-4 rounded-md disabled:opacity-50"
      >
        {busy ? 'Accepting…' : 'Accept invite'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
