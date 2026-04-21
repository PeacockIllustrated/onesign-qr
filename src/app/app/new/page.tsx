'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Link2, AlertCircle } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useToast,
} from '@/components/ui';
import { CarrierCard } from '@/components/qr/carrier-card';
import { QRPreview } from '@/components/qr/qr-preview';
import { StylePanel } from '@/components/qr/style-panel';
import { validateUrl } from '@/lib/security/url-validator';
import { QR_DEFAULTS } from '@/lib/constants';
import type { QRStyleConfig, QRCarrier } from '@/types/qr';

function CreateLinkForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { addToast } = useToast();

  // Prefill destination URL if passed from the direct-qr page
  const prefilledUrl = search.get('url') ?? '';

  // Form state
  const [name, setName] = useState('');
  const [destinationUrl, setDestinationUrl] = useState(prefilledUrl);
  const [slug, setSlug] = useState('');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [nfcEnabled, setNfcEnabled] = useState(false);

  // Plan state (fetched on mount)
  const [plan, setPlan] = useState<'free' | 'pro'>('free');

  // Style state
  const [style, setStyle] = useState<QRStyleConfig>({
    foregroundColor: '#000000',
    backgroundColor: '#FFFFFF',
    errorCorrection: 'M',
    quietZone: QR_DEFAULTS.QUIET_ZONE,
    moduleShape: 'square',
    eyeShape: 'square',
    logoMode: 'none',
    logoDataUrl: undefined,
    logoSizeRatio: QR_DEFAULTS.DEFAULT_LOGO_RATIO,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Fetch current org plan on mount
  useEffect(() => {
    fetch('/api/org/current-plan')
      .then((r) => r.json())
      .then((data) => {
        if (data?.plan === 'pro') setPlan('pro');
      })
      .catch(() => {
        // Leave plan as 'free' on error — Pro features stay gated
      });
  }, []);

  // Validate URL on change
  useEffect(() => {
    if (!destinationUrl) {
      setUrlError(null);
      return;
    }
    const result = validateUrl(destinationUrl);
    setUrlError(result.isValid ? null : result.error || 'Invalid URL');
  }, [destinationUrl]);

  const previewUrl =
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}/r/${slug || 'preview'}`;

  // Derive carrier intent from toggled sections
  const carrier: QRCarrier = nfcEnabled && plan === 'pro' ? 'both' : 'qr';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !destinationUrl) {
      addToast({ title: 'Please fill in all required fields', variant: 'error' });
      return;
    }
    if (urlError) {
      addToast({ title: 'Please fix the URL error', variant: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          mode: 'managed',
          destination_url: destinationUrl,
          slug: slug || undefined,
          carrier,
          analytics_enabled: analyticsEnabled,
          style: {
            foreground_color: style.foregroundColor,
            background_color: style.backgroundColor,
            error_correction: style.errorCorrection,
            quiet_zone: style.quietZone,
            module_shape: style.moduleShape,
            eye_shape: style.eyeShape,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === 'pro_plan_required') {
          addToast({
            title: 'NFC chips require a Pro plan',
            description: 'Upgrade at /pricing to enable NFC carriers.',
            variant: 'error',
          });
        } else {
          addToast({
            title: 'Failed to create Link',
            description: body.error || 'Unknown error',
            variant: 'error',
          });
        }
        return;
      }

      const { id } = await res.json();
      addToast({ title: 'Link created!', variant: 'success' });
      router.push(`/app/qr/${id}`);
    } catch (error: any) {
      addToast({
        title: 'Failed to create Link',
        description: error.message,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Create a Link</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage one destination across QR codes, NFC chips, and more.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Link details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Link details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Spring Menu, Counter Card"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">Destination URL *</Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com/menu"
                      value={destinationUrl}
                      onChange={(e) => setDestinationUrl(e.target.value)}
                      className="pl-10"
                      error={!!urlError}
                      required
                    />
                  </div>
                  {urlError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {urlError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Custom slug (optional)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground shrink-0">/r/</span>
                    <Input
                      id="slug"
                      placeholder="auto-generated"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to auto-generate. Lowercase letters, numbers, and hyphens only.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="analytics"
                    checked={analyticsEnabled}
                    onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="analytics" className="text-sm font-normal cursor-pointer">
                    Enable scan analytics
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* QR carrier */}
            <CarrierCard variant="qr">
              <StylePanel style={style} onChange={setStyle} />
            </CarrierCard>

            {/* NFC carrier */}
            <CarrierCard
              variant="nfc"
              plan={plan}
              enabled={nfcEnabled}
              onEnabledChange={setNfcEnabled}
            >
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                  Order pre-programmed NFC chips for this Link. We&apos;ll print and programme
                  them before dispatch — you change the destination from your dashboard, any time.
                </p>
                <Link
                  href={`/app/shop?category=nfc_card`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-lynx-400 hover:text-lynx-300"
                >
                  View NFC chip options
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </CarrierCard>

            <div className="pt-2 text-xs text-muted-foreground">
              Need a one-off QR instead?{' '}
              <Link
                href={destinationUrl ? `/app/qr/direct/new?url=${encodeURIComponent(destinationUrl)}` : `/app/qr/direct/new`}
                className="text-lynx-400 hover:text-lynx-300 underline"
              >
                Generate a direct QR
              </Link>
            </div>
          </div>

          <div className="lg:sticky lg:top-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <QRPreview data={previewUrl || 'https://example.com'} style={style} />
                <p className="mt-4 text-xs text-center text-muted-foreground">
                  Encodes your managed Link URL
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Link href="/app" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={isLoading || !!urlError}>
                {isLoading ? 'Creating…' : 'Create Link'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CreateLinkPage() {
  return (
    <Suspense>
      <CreateLinkForm />
    </Suspense>
  );
}
