'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Copy, Trash2, Loader2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  useToast,
} from '@/components/ui';
import { renderTemplate, isDoubleSidedTemplate } from '@/components/brand/templates';
import { FontLoader } from '@/components/brand/font-loader';
import { Card3dViewer } from '@/components/brand/card-3d-viewer';
import type { BrandDesignHydrated, BrandPerson, BrandDesignConfig, AvatarShape, CardBackStyle } from '@/types/brand';

interface Props {
  design: BrandDesignHydrated;
  people: BrandPerson[];
}

export function BrandDesignEditor({ design: initial, people }: Props) {
  const router = useRouter();
  const { addToast } = useToast();

  const [name, setName] = useState(initial.name);
  const [personId, setPersonId] = useState<string | null>(initial.person_id);
  const [config, setConfig] = useState<BrandDesignConfig>(initial.config ?? {});
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Live preview uses the latest config + person picked
  const previewDesign: BrandDesignHydrated = useMemo(() => {
    const newPerson = personId ? people.find((p) => p.id === personId) ?? null : null;
    return {
      ...initial,
      name,
      person_id: personId,
      person: newPerson,
      person_photo_url: null,
      config,
    };
  }, [initial, name, personId, config, people]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/brand/designs/${initial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, person_id: personId, config }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      addToast({ title: 'Saved', variant: 'success' });
      router.refresh();
    } catch (err: any) {
      addToast({ title: 'Save failed', description: err.message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function exportPdf() {
    setExporting(true);
    try {
      const res = await fetch(`/api/brand/designs/${initial.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'pdf' }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'PDF generation failed');
      const blob = await res.blob();
      downloadBlob(blob, `${slugify(name)}.pdf`);
      addToast({ title: 'PDF downloaded', variant: 'success' });
    } catch (err: any) {
      addToast({ title: 'Export failed', description: err.message, variant: 'error' });
    } finally {
      setExporting(false);
    }
  }

  async function exportHtml() {
    setExporting(true);
    try {
      const res = await fetch(`/api/brand/designs/${initial.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'html' }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Export failed');
      const html = await res.text();
      downloadBlob(new Blob([html], { type: 'text/html' }), `${slugify(name)}-signature.html`);
      addToast({ title: 'HTML downloaded', variant: 'success' });
    } catch (err: any) {
      addToast({ title: 'Export failed', description: err.message, variant: 'error' });
    } finally {
      setExporting(false);
    }
  }

  async function copySignatureHtml() {
    try {
      const res = await fetch(`/api/brand/designs/${initial.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'html' }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Export failed');
      const html = await res.text();

      // Use the rich-text clipboard so pasting into Gmail/Outlook renders the
      // signature, not raw HTML source.
      const blob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([html], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob }),
      ]);
      addToast({ title: 'Signature copied — paste into your email client', variant: 'success' });
    } catch (err: any) {
      addToast({ title: 'Copy failed', description: err.message, variant: 'error' });
    }
  }

  async function deleteDesign() {
    if (!confirm('Delete this design?')) return;
    const res = await fetch(`/api/brand/designs/${initial.id}`, { method: 'DELETE' });
    if (res.ok) router.push(`/app/brand-kit/${initial.brand_profile_id}`);
  }

  return (
    <div>
      <FontLoader fonts={[initial.profile.font_heading, initial.profile.font_body]} />
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0 flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-2xl font-semibold border-0 bg-transparent px-0 h-auto focus-visible:ring-0"
          />
          <p className="text-sm text-muted-foreground mt-1">
            {initial.kind === 'business_card' ? 'Business card' : 'Email signature'} · template {initial.template_id}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          <Button variant="outline" onClick={deleteDesign}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left — controls */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label className="text-xs">Person</Label>
                <Select value={personId ?? ''} onChange={(e) => setPersonId(e.target.value || null)}>
                  <option value="">(none)</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </Select>
              </div>

              <div>
                <Label className="text-xs">Tagline override</Label>
                <Input
                  value={config.tagline ?? ''}
                  onChange={(e) => setConfig({ ...config, tagline: e.target.value || undefined })}
                  placeholder={initial.profile.tagline ?? 'Use brand tagline'}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <ColorOverride
                  label="Primary"
                  value={config.primary_color}
                  fallback={initial.profile.primary_color}
                  onChange={(v) => setConfig({ ...config, primary_color: v })}
                />
                <ColorOverride
                  label="Secondary"
                  value={config.secondary_color}
                  fallback={initial.profile.secondary_color}
                  onChange={(v) => setConfig({ ...config, secondary_color: v })}
                />
                <ColorOverride
                  label="Accent"
                  value={config.accent_color}
                  fallback={initial.profile.accent_color ?? '—'}
                  onChange={(v) => setConfig({ ...config, accent_color: v })}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="show-logo"
                  type="checkbox"
                  checked={config.show_logo !== false}
                  onChange={(e) => setConfig({ ...config, show_logo: e.target.checked })}
                />
                <Label htmlFor="show-logo" className="cursor-pointer">Show logo</Label>
              </div>

              {/* Card-specific: avatar + back style */}
              {initial.kind === 'business_card' && isDoubleSidedTemplate(initial.template_id) && (
                <div className="pt-2 mt-2 border-t border-border space-y-3">
                  <p className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Card options</p>

                  <div>
                    <Label className="text-xs">Avatar shape</Label>
                    <Select
                      value={config.avatar_shape ?? 'none'}
                      onChange={(e) => setConfig({ ...config, avatar_shape: e.target.value as AvatarShape })}
                    >
                      <option value="none">No avatar</option>
                      <option value="circle">Circle</option>
                      <option value="square">Square (rounded)</option>
                    </Select>
                  </div>

                  {(config.avatar_shape ?? 'none') !== 'none' && (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          id="avatar-border"
                          type="checkbox"
                          checked={config.avatar_border ?? false}
                          onChange={(e) => setConfig({ ...config, avatar_border: e.target.checked })}
                        />
                        <Label htmlFor="avatar-border" className="cursor-pointer">Avatar border</Label>
                      </div>
                      {config.avatar_border && (
                        <ColorOverride
                          label="Border colour"
                          value={config.avatar_border_color}
                          fallback={config.accent_color ?? initial.profile.accent_color ?? initial.profile.primary_color}
                          onChange={(v) => setConfig({ ...config, avatar_border_color: v })}
                        />
                      )}
                    </>
                  )}

                  <div>
                    <Label className="text-xs">Back style</Label>
                    <Select
                      value={config.back_style ?? (initial.template_id === 'card-mono' ? 'solid-accent' : 'logo-centered')}
                      onChange={(e) => setConfig({ ...config, back_style: e.target.value as CardBackStyle })}
                    >
                      <option value="logo-centered">Logo centred</option>
                      <option value="solid-accent">Solid accent + tagline</option>
                      <option value="monogram">Monogram</option>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export actions */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm font-medium text-zinc-100">Export</p>
              {initial.kind === 'business_card' ? (
                <Button onClick={exportPdf} disabled={exporting} className="w-full">
                  {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Download print-ready PDF
                </Button>
              ) : (
                <>
                  <Button onClick={copySignatureHtml} className="w-full">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy signature
                  </Button>
                  <Button onClick={exportHtml} variant="outline" disabled={exporting} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download HTML file
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Paste into Gmail (Settings → Signature) or Outlook (File → Options → Mail → Signatures).
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — preview */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Preview</p>
              <div className="bg-zinc-900/40 border border-border rounded-md p-10 min-h-[340px] flex items-center justify-center">
                {initial.kind === 'business_card' && isDoubleSidedTemplate(initial.template_id) ? (
                  <Card3dViewer
                    front={renderTemplate(previewDesign, { side: 'front' })}
                    back={renderTemplate(previewDesign, { side: 'back' })}
                    aspect="85 / 55"
                    width="min(440px, 100%)"
                  />
                ) : initial.kind === 'business_card' ? (
                  <div style={{ transform: 'scale(2.4)', transformOrigin: 'center' }}>
                    {renderTemplate(previewDesign)}
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    {renderTemplate(previewDesign)}
                  </div>
                )}
              </div>
              {initial.kind === 'business_card' && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  {isDoubleSidedTemplate(initial.template_id)
                    ? 'Move cursor to tilt · click the card or the button to flip · the exported PDF is print-ready with 3mm bleed and crop marks.'
                    : 'The exported PDF is print-ready with 3mm bleed and crop marks.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ColorOverride({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string | undefined;
  fallback: string;
  onChange: (v: string | undefined) => void;
}) {
  const isOverriding = value !== undefined;
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={value ?? fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 rounded border border-input bg-transparent cursor-pointer"
        />
        {isOverriding && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-muted-foreground hover:text-foreground"
            title="Use brand default"
          >
            reset
          </button>
        )}
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'design';
}
