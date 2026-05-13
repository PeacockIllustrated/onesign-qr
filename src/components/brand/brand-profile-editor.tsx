'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, Upload, X, CreditCard, Mail } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Input,
  Label,
  Select,
  useToast,
} from '@/components/ui';
import { BRAND_TEMPLATES } from '@/lib/brand/templates';
import { FontPicker } from '@/components/brand/font-picker';
import type { BrandProfile, BrandPerson, BrandDesign, BrandDesignKind } from '@/types/brand';
import { formatDate } from '@/lib/utils';

interface Props {
  profile: BrandProfile;
  people: BrandPerson[];
  designs: BrandDesign[];
  logoUrl: string | null;
  logoDarkUrl: string | null;
}

export function BrandProfileEditor({ profile: initial, people, designs, logoUrl: initialLogo, logoDarkUrl: initialLogoDark }: Props) {
  const router = useRouter();
  const { addToast } = useToast();

  const [profile, setProfile] = useState(initial);
  const [logoUrl, setLogoUrl] = useState(initialLogo);
  const [logoDarkUrl, setLogoDarkUrl] = useState(initialLogoDark);
  const [saving, setSaving] = useState(false);

  function patch<K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        name: profile.name,
        tagline: profile.tagline,
        primary_color: profile.primary_color,
        secondary_color: profile.secondary_color,
        accent_color: profile.accent_color,
        font_heading: profile.font_heading,
        font_body: profile.font_body,
        website: profile.website,
        socials: profile.socials,
      };
      const res = await fetch(`/api/brand/profiles/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to save');
      addToast({ title: 'Saved', variant: 'success' });
      router.refresh();
    } catch (err: any) {
      addToast({ title: 'Save failed', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File, variant: 'light' | 'dark' = 'light') {
    const formData = new FormData();
    formData.append('file', file);
    if (variant === 'dark') formData.append('variant', 'dark');
    try {
      const res = await fetch(`/api/brand/profiles/${profile.id}/logo`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Upload failed');
      const data = await res.json();
      // Cache-bust: same Supabase Storage URL after re-upload would show the
      // stale browser-cached image. Append a timestamp query param so the
      // <img> reloads fresh.
      const freshUrl = `${data.public_url}?t=${Date.now()}`;
      if (variant === 'dark') setLogoDarkUrl(freshUrl);
      else setLogoUrl(freshUrl);
      addToast({ title: `${variant === 'dark' ? 'Dark' : 'Light'} logo uploaded`, variant: 'success' });
      router.refresh();
    } catch (err: any) {
      addToast({ title: 'Upload failed', description: err.message, variant: 'error' });
    }
  }

  async function removeLogo(variant: 'light' | 'dark' = 'light') {
    const res = await fetch(`/api/brand/profiles/${profile.id}/logo?variant=${variant}`, { method: 'DELETE' });
    if (res.ok) {
      if (variant === 'dark') setLogoDarkUrl(null);
      else setLogoUrl(null);
      router.refresh();
    }
  }

  async function deleteProfile() {
    if (!confirm('Delete this brand profile? Designs will also be removed.')) return;
    const res = await fetch(`/api/brand/profiles/${profile.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/app/brand-kit');
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0 flex-1">
          <Input
            value={profile.name}
            onChange={(e) => patch('name', e.target.value)}
            className="text-2xl font-semibold border-0 bg-transparent px-0 h-auto focus-visible:ring-0"
          />
          <Input
            value={profile.tagline ?? ''}
            onChange={(e) => patch('tagline', e.target.value || null)}
            placeholder="Add a tagline…"
            className="text-sm text-muted-foreground border-0 bg-transparent px-0 h-auto focus-visible:ring-0 mt-1"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="outline" onClick={deleteProfile}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="identity">
        <TabsList>
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="people">People ({people.length})</TabsTrigger>
          <TabsTrigger value="designs">Designs ({designs.length})</TabsTrigger>
        </TabsList>

        {/* ─── Identity tab ──────────────────────────────────────── */}
        <TabsContent value="identity">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Logos: light + dark */}
              <div className="space-y-3">
                <Label>Logos</Label>
                <div className="grid grid-cols-2 gap-4">
                  <LogoSlot
                    label="Light background"
                    swatch="#ffffff"
                    url={logoUrl}
                    onUpload={(f) => uploadLogo(f, 'light')}
                    onRemove={() => removeLogo('light')}
                  />
                  <LogoSlot
                    label="Dark background"
                    swatch="#0a0a0a"
                    url={logoDarkUrl}
                    onUpload={(f) => uploadLogo(f, 'dark')}
                    onRemove={() => removeLogo('dark')}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload the right logo for each background — templates pick the version that fits the card side.
                  PNG, JPG, SVG or WebP, max 5MB.
                </p>
              </div>

              {/* Colours */}
              <div className="grid grid-cols-3 gap-4">
                <ColorField label="Primary" value={profile.primary_color} onChange={(v) => patch('primary_color', v)} />
                <ColorField label="Secondary" value={profile.secondary_color} onChange={(v) => patch('secondary_color', v)} />
                <ColorField
                  label="Accent (optional)"
                  value={profile.accent_color ?? ''}
                  onChange={(v) => patch('accent_color', v || null)}
                  allowEmpty
                />
              </div>

              {/* Fonts — searchable Google Fonts picker */}
              <div className="grid grid-cols-2 gap-4">
                <FontPicker
                  label="Heading font"
                  value={profile.font_heading}
                  onChange={(v) => patch('font_heading', v)}
                />
                <FontPicker
                  label="Body font"
                  value={profile.font_body}
                  onChange={(v) => patch('font_body', v)}
                />
              </div>

              {/* Web + socials + action links */}
              <div className="space-y-4">
                <div>
                  <Label>Website</Label>
                  <Input
                    value={profile.website ?? ''}
                    onChange={(e) => patch('website', e.target.value || null)}
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wider text-zinc-400">Socials</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <SocialField label="LinkedIn" value={profile.socials.linkedin ?? ''} onChange={(v) => patch('socials', { ...profile.socials, linkedin: v })} />
                    <SocialField label="Twitter / X" value={profile.socials.twitter ?? ''} onChange={(v) => patch('socials', { ...profile.socials, twitter: v })} />
                    <SocialField label="Instagram" value={profile.socials.instagram ?? ''} onChange={(v) => patch('socials', { ...profile.socials, instagram: v })} />
                    <SocialField label="Threads" value={profile.socials.threads ?? ''} onChange={(v) => patch('socials', { ...profile.socials, threads: v })} />
                    <SocialField label="Facebook" value={profile.socials.facebook ?? ''} onChange={(v) => patch('socials', { ...profile.socials, facebook: v })} />
                    <SocialField label="YouTube" value={profile.socials.youtube ?? ''} onChange={(v) => patch('socials', { ...profile.socials, youtube: v })} />
                    <SocialField label="TikTok" value={profile.socials.tiktok ?? ''} onChange={(v) => patch('socials', { ...profile.socials, tiktok: v })} />
                    <SocialField label="Mastodon" value={profile.socials.mastodon ?? ''} onChange={(v) => patch('socials', { ...profile.socials, mastodon: v })} />
                    <SocialField label="GitHub" value={profile.socials.github ?? ''} onChange={(v) => patch('socials', { ...profile.socials, github: v })} />
                    <SocialField label="Behance" value={profile.socials.behance ?? ''} onChange={(v) => patch('socials', { ...profile.socials, behance: v })} />
                    <SocialField label="Dribbble" value={profile.socials.dribbble ?? ''} onChange={(v) => patch('socials', { ...profile.socials, dribbble: v })} />
                    <SocialField label="Portfolio" value={profile.socials.portfolio ?? ''} onChange={(v) => patch('socials', { ...profile.socials, portfolio: v })} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wider text-zinc-400">Action links</Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-2">
                    Surfaced as call-to-action links on signatures.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <SocialField label="Calendar (Calendly, etc.)" value={profile.socials.calendar ?? ''} onChange={(v) => patch('socials', { ...profile.socials, calendar: v })} />
                    <SocialField label="Booking / scheduling" value={profile.socials.booking ?? ''} onChange={(v) => patch('socials', { ...profile.socials, booking: v })} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── People tab ────────────────────────────────────────── */}
        <TabsContent value="people">
          <PeopleSection profileId={profile.id} people={people} />
        </TabsContent>

        {/* ─── Designs tab ───────────────────────────────────────── */}
        <TabsContent value="designs">
          <DesignsSection profileId={profile.id} designs={designs} people={people} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function LogoSlot({
  label,
  swatch,
  url,
  onUpload,
  onRemove,
}: {
  label: string;
  swatch: string;
  url: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className="rounded-md border border-border flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: swatch, minHeight: 80 }}
      >
        {url ? (
          <img src={url} alt="" className="max-h-16 max-w-[80%] object-contain" />
        ) : (
          <Upload className="h-5 w-5" style={{ color: swatch === '#ffffff' ? '#a1a1aa' : '#52525b' }} />
        )}
      </div>
      <div className="flex gap-2">
        <label className="inline-flex flex-1">
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = '';
            }}
          />
          <span className="inline-flex items-center justify-center h-9 px-3 text-sm rounded-lg border border-input cursor-pointer hover:bg-accent w-full">
            {url ? 'Replace' : 'Upload'}
          </span>
        </label>
        {url && (
          <Button variant="outline" size="sm" onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  allowEmpty,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded border border-input bg-transparent cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={allowEmpty ? '#RRGGBB or empty' : '#RRGGBB'}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}

function SocialField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" />
    </div>
  );
}

// ─── People ──────────────────────────────────────────────────────────

function PeopleSection({ profileId, people }: { profileId: string; people: BrandPerson[] }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<BrandPerson>>({});

  async function addPerson() {
    if (!draft.full_name) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/brand/profiles/${profileId}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setDraft({});
      router.refresh();
    } catch (err: any) {
      addToast({ title: 'Could not add', description: err.message, variant: 'error' });
    } finally {
      setAdding(false);
    }
  }

  async function deletePerson(id: string) {
    if (!confirm('Remove this person?')) return;
    await fetch(`/api/brand/people/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  async function uploadPhoto(personId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`/api/brand/people/${personId}/photo`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const reason = body?.details ?? body?.error ?? `HTTP ${res.status}`;
        throw new Error(reason);
      }
      addToast({ title: 'Photo uploaded', variant: 'success' });
      router.refresh();
    } catch (err: any) {
      addToast({ title: 'Photo upload failed', description: err.message, variant: 'error' });
    }
  }

  async function removePhoto(personId: string) {
    await fetch(`/api/brand/people/${personId}/photo`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {people.map((p) => {
          // updated_at appended for cache-busting when the user replaces a photo.
          const photoUrl = p.photo_storage_path
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/brand-assets/${p.photo_storage_path}?t=${new Date(p.updated_at).getTime()}`
            : null;
          return (
            <div key={p.id} className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
              {/* Photo */}
              <div className="shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt={p.full_name} className="h-12 w-12 rounded-full object-cover border border-border" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-zinc-800 border border-border flex items-center justify-center text-xs text-zinc-500">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-100">{p.full_name}</p>
                {p.role && <p className="text-sm text-muted-foreground">{p.role}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {[p.email, p.phone, p.mobile].filter(Boolean).join(' · ') || '—'}
                </p>
                <div className="flex gap-2 mt-2">
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadPhoto(p.id, file);
                        e.target.value = '';
                      }}
                    />
                    <span className="text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer underline">
                      {photoUrl ? 'Replace photo' : 'Add photo'}
                    </span>
                  </label>
                  {photoUrl && (
                    <button onClick={() => removePhoto(p.id)} className="text-xs text-zinc-400 hover:text-zinc-100 underline">
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deletePerson(p.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        <div className="pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Full name *" value={draft.full_name ?? ''} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} />
            <Input placeholder="Role / job title" value={draft.role ?? ''} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
            <Input placeholder="Email" value={draft.email ?? ''} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            <Input placeholder="Phone" value={draft.phone ?? ''} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            <Input placeholder="Mobile" value={draft.mobile ?? ''} onChange={(e) => setDraft({ ...draft, mobile: e.target.value })} />
            <Input placeholder="Pronouns" value={draft.pronouns ?? ''} onChange={(e) => setDraft({ ...draft, pronouns: e.target.value })} />
          </div>
          <Button onClick={addPerson} disabled={adding || !draft.full_name} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add person
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Designs ─────────────────────────────────────────────────────────

function DesignsSection({
  profileId,
  designs,
  people,
}: {
  profileId: string;
  designs: BrandDesign[];
  people: BrandPerson[];
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [creating, setCreating] = useState<BrandDesignKind | null>(null);
  const [draft, setDraft] = useState<{ template_id: string; person_id: string | null; name: string }>({
    template_id: '',
    person_id: people[0]?.id ?? null,
    name: '',
  });

  function startCreate(kind: BrandDesignKind) {
    const tmpls = BRAND_TEMPLATES.filter((t) => t.kind === kind);
    setDraft({
      template_id: tmpls[0]?.id ?? '',
      person_id: people[0]?.id ?? null,
      name: `${kind === 'business_card' ? 'Business card' : 'Email signature'}${people[0] ? ` — ${people[0].full_name}` : ''}`,
    });
    setCreating(kind);
  }

  async function createDesign() {
    if (!creating || !draft.template_id) return;
    try {
      const res = await fetch('/api/brand/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_profile_id: profileId,
          person_id: draft.person_id,
          kind: creating,
          template_id: draft.template_id,
          name: draft.name,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const design = await res.json();
      router.push(`/app/brand-kit/${profileId}/designs/${design.id}`);
    } catch (err: any) {
      addToast({ title: 'Could not create', description: err.message, variant: 'error' });
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Existing designs */}
        {designs.length === 0 && !creating && (
          <p className="text-sm text-muted-foreground py-4 text-center">No designs yet.</p>
        )}

        {designs.map((d) => (
          <Link
            key={d.id}
            href={`/app/brand-kit/${profileId}/designs/${d.id}`}
            className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-b-0 hover:bg-zinc-900/30 -mx-2 px-2 rounded transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              {d.kind === 'business_card' ? (
                <CreditCard className="h-4 w-4 text-zinc-500 shrink-0" />
              ) : (
                <Mail className="h-4 w-4 text-zinc-500 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-medium text-zinc-100 truncate">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {d.kind === 'business_card' ? 'Business card' : 'Email signature'} · {d.template_id} · Updated {formatDate(d.updated_at)}
                </p>
              </div>
            </div>
          </Link>
        ))}

        {/* Create flow */}
        {!creating ? (
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => startCreate('business_card')}>
              <CreditCard className="h-4 w-4 mr-1" />
              New business card
            </Button>
            <Button size="sm" variant="outline" onClick={() => startCreate('email_signature')}>
              <Mail className="h-4 w-4 mr-1" />
              New email signature
            </Button>
          </div>
        ) : (
          <div className="pt-3 border-t border-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Template</Label>
                <Select
                  value={draft.template_id}
                  onChange={(e) => setDraft({ ...draft, template_id: e.target.value })}
                >
                  {BRAND_TEMPLATES.filter((t) => t.kind === creating).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label className="text-xs">Person</Label>
                <Select
                  value={draft.person_id ?? ''}
                  onChange={(e) => setDraft({ ...draft, person_id: e.target.value || null })}
                >
                  <option value="">(none)</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={createDesign} disabled={!draft.template_id || !draft.name}>Create</Button>
              <Button variant="outline" onClick={() => setCreating(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
