'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button, Input, Label, useToast } from '@/components/ui';

export function CreateBrandProfileButton() {
  const router = useRouter();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/brand/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to create profile');
      }
      const profile = await res.json();
      router.push(`/app/brand-kit/${profile.id}`);
    } catch (err: any) {
      addToast({ title: 'Could not create profile', description: err.message, variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="rounded-lg">
        <Plus className="h-4 w-4 mr-2" />
        New Brand
      </Button>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <div>
        <Label htmlFor="brand-name" className="text-xs">Brand name</Label>
        <Input
          id="brand-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') create();
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="e.g. OneSign Brand"
          className="w-56"
        />
      </div>
      <Button onClick={create} disabled={busy || !name.trim()}>
        {busy ? 'Creating…' : 'Create'}
      </Button>
      <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
        Cancel
      </Button>
    </div>
  );
}
