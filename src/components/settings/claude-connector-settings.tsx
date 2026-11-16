'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, KeyRound } from 'lucide-react';
import { Button, Input, Label } from '@/components/ui';

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200">
          {value}
        </code>
        <button
          type="button"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded-lg border border-zinc-800 p-2 text-zinc-400 hover:text-lynx-400 hover:border-lynx-400/40 transition-colors"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function ClaudeConnectorSettings({
  initialKeys,
  mcpUrl,
}: {
  initialKeys: ApiKeyRow[];
  mcpUrl: string;
}) {
  const router = useRouter();
  const [name, setName] = useState('Claude');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  const activeKeys = initialKeys.filter((k) => !k.revoked_at);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name }),
      });
      const json = (await res.json().catch(() => ({}))) as { key?: string; error?: string };
      if (!res.ok || !json.key) {
        setError(json.error ?? 'Failed to create key');
        return;
      }
      setNewKey(json.key);
      router.refresh();
    } catch {
      setError('Failed to create key');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this key? Claude will stop being able to use it straight away.')) return;
    const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE', credentials: 'same-origin' });
    if (res.ok) router.refresh();
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Claude connector</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Let Claude create, edit and export QR codes in your Lynx account. Ask things like
          &ldquo;make a QR code for our menu&rdquo; and it appears here, fully managed.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          1. Create a key
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          {newKey ? (
            <div className="space-y-4">
              <p className="text-sm text-lynx-400">
                Key created. Copy it now. For security it won&rsquo;t be shown again.
              </p>
              <CopyField label="Connector URL for claude.ai (contains your key, keep it private)" value={`${mcpUrl}/${newKey}`} />
              <CopyField label="API key (for Claude Code / Bearer header)" value={newKey} />
              <Button type="button" variant="outline" onClick={() => setNewKey(null)}>
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={createKey} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key name</Label>
                <Input
                  id="key-name"
                  required
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Claude (work laptop)"
                />
              </div>
              <Button type="submit" disabled={busy}>
                <KeyRound className="h-4 w-4 mr-2" />
                {busy ? 'Creating…' : 'Create key'}
              </Button>
              {error && <p className="text-sm text-destructive" role="status">{error}</p>}
            </form>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          2. Add it to Claude
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-5 text-sm text-zinc-300">
          <div>
            <div className="font-medium text-zinc-100">claude.ai, Claude desktop and mobile</div>
            <p className="mt-1 text-zinc-400">
              Settings → Connectors → Add custom connector. Name it &ldquo;Lynx QR&rdquo; and paste the
              connector URL shown when you created the key (<code className="font-mono text-xs">{mcpUrl}/lynx_…</code>).
            </p>
          </div>
          <div>
            <div className="font-medium text-zinc-100">Claude Code</div>
            <code className="mt-2 block rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200 whitespace-pre-wrap break-all">
              {`claude mcp add --transport http lynx-qr ${mcpUrl} --header "Authorization: Bearer lynx_…"`}
            </code>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Your keys ({activeKeys.length})
        </h2>
        {initialKeys.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
            <p className="text-sm text-zinc-500">No keys yet.</p>
          </div>
        ) : (
          <ul className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
            {initialKeys.map((k) => (
              <li key={k.id} className="p-4 text-sm flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className={k.revoked_at ? 'text-zinc-500 line-through truncate' : 'text-zinc-100 truncate'}>
                    {k.name}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 flex flex-wrap items-center gap-x-3">
                    <span className="font-mono">{k.key_prefix}…</span>
                    <span>created {new Date(k.created_at).toLocaleDateString()}</span>
                    <span>
                      {k.last_used_at ? `last used ${new Date(k.last_used_at).toLocaleDateString()}` : 'never used'}
                    </span>
                    {k.revoked_at && <span>revoked</span>}
                  </div>
                </div>
                {!k.revoked_at && (
                  <button
                    type="button"
                    onClick={() => revoke(k.id)}
                    className="text-xs font-semibold text-destructive hover:text-destructive/80 transition-colors"
                  >
                    Revoke
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
