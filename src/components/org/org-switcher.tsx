'use client';

import { useEffect, useState } from 'react';
import type { OrganizationSummary } from '@/types/organization';

interface ApiResponse {
  orgs: OrganizationSummary[];
}

export function OrgSwitcher() {
  const [orgs, setOrgs] = useState<OrganizationSummary[] | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/org', { credentials: 'same-origin' })
      .then((r) => r.json() as Promise<ApiResponse>)
      .then((data) => {
        if (cancelled) return;
        setOrgs(data.orgs ?? []);
        // The server resolves active-org from the cookie; on the client we
        // just default to the first entry for display until we switch.
        setActiveOrgId(data.orgs?.[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load organisations');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSwitch(orgId: string) {
    if (orgId === activeOrgId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/org/switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ orgId }),
      });
      if (!res.ok) {
        setError('Switch failed');
      } else {
        setActiveOrgId(orgId);
        // A full reload ensures all server components re-render with the
        // new active-org cookie in effect.
        window.location.reload();
      }
    } catch {
      setError('Switch failed');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  if (!orgs) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500" aria-label="Loading organisation">
        Loading…
      </div>
    );
  }

  const active = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];
  if (!active) {
    return (
      <div className="px-3 py-2 text-sm text-red-600">
        No organisation available.
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{active.name}</span>
        <span className="ml-2 text-xs text-gray-500">
          {active.role}
          {active.plan === 'pro' ? ' · Pro' : ''}
        </span>
      </button>
      {open && orgs.length > 1 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 mt-1 z-10 bg-white border border-gray-200 rounded-md shadow-md text-sm"
        >
          {orgs.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => handleSwitch(o.id)}
                className={
                  'w-full text-left px-3 py-2 hover:bg-gray-50 ' +
                  (o.id === activeOrgId ? 'font-semibold text-blue-700' : '')
                }
              >
                <span className="truncate block">{o.name}</span>
                <span className="text-xs text-gray-500">
                  {o.role}
                  {o.plan === 'pro' ? ' · Pro' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="mt-1 px-3 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
