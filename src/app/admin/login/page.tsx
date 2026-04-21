'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Button, Input, Label } from '@/components/ui';

function LoginInner() {
  const params = useSearchParams();
  const next = params.get('next') || '/admin';

  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(json.error ?? 'Failed to start admin session');
        setBusy(false);
        return;
      }
      // Hard navigation — a client-side router.push would race with the
      // HttpOnly admin session cookie the POST just set, leaving the user
      // on /admin/login. window.location forces a full request that
      // carries the new cookie through middleware.
      window.location.href = next;
    } catch {
      setError('Failed to start admin session');
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center h-10 w-10 rounded-xl bg-lynx-500/15 border border-lynx-400/30 text-lynx-400">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-zinc-50">
              Admin step-up
            </h1>
            <p className="text-[11px] uppercase tracking-widest text-zinc-500">
              OneSign · Lynx
            </p>
          </div>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Re-enter your password to start an admin session. Sessions expire
          after 30 minutes of inactivity.
        </p>
        <div className="space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <Input
            id="admin-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Verifying…' : 'Start admin session'}
        </Button>
        {error && (
          <p
            className="p-3 rounded-lg text-sm bg-destructive/15 text-destructive border border-destructive/30"
            role="alert"
          >
            {error}
          </p>
        )}
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
