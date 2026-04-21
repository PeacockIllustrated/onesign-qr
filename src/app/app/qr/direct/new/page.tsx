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
import { QRPreview } from '@/components/qr/qr-preview';
import { StylePanel } from '@/components/qr/style-panel';
import { DirectQRConfirmationModal } from '@/components/qr/direct-qr-confirmation-modal';
import { validateUrl } from '@/lib/security/url-validator';
import { QR_DEFAULTS } from '@/lib/constants';
import type { QRStyleConfig } from '@/types/qr';

function DirectQRForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { addToast } = useToast();

  const prefilledUrl = search.get('url') ?? '';

  const [name, setName] = useState('');
  const [destinationUrl, setDestinationUrl] = useState(prefilledUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

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

  useEffect(() => {
    if (!destinationUrl) {
      setUrlError(null);
      return;
    }
    const result = validateUrl(destinationUrl);
    setUrlError(result.isValid ? null : result.error || 'Invalid URL');
  }, [destinationUrl]);

  const openConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationUrl) {
      addToast({ title: 'Destination URL is required', variant: 'error' });
      return;
    }
    if (urlError) {
      addToast({ title: 'Please fix the URL error', variant: 'error' });
      return;
    }
    setModalOpen(true);
  };

  const submitDirect = async () => {
    setModalOpen(false);
    setIsLoading(true);
    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name || 'One-off QR',
          mode: 'direct',
          destination_url: destinationUrl,
          analytics_enabled: false,
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
        addToast({
          title: 'Failed to generate QR',
          description: body.error || 'Unknown error',
          variant: 'error',
        });
        return;
      }
      const { id } = await res.json();
      addToast({ title: 'QR generated!', variant: 'success' });
      router.push(`/app/qr/${id}`);
    } catch (error: any) {
      addToast({
        title: 'Failed to generate QR',
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
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Generate a one-off QR
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          The destination is encoded into the image permanently and cannot be changed later.
        </p>
        <p className="text-sm mt-2">
          <Link
            href={destinationUrl ? `/app/new?url=${encodeURIComponent(destinationUrl)}` : '/app/new'}
            className="text-lynx-400 hover:text-lynx-300 underline"
          >
            Or create a managed Link instead
          </Link>
        </p>
      </div>

      <form onSubmit={openConfirmation}>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Flyer for October event"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Destination URL *</Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com/flyer"
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Style</CardTitle>
              </CardHeader>
              <CardContent>
                <StylePanel style={style} onChange={setStyle} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <QRPreview data={destinationUrl || 'https://example.com'} style={style} />
                <p className="mt-4 text-xs text-center text-muted-foreground">
                  Encodes the URL directly
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
                {isLoading ? 'Generating\u2026' : 'Generate'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <DirectQRConfirmationModal
        open={modalOpen}
        destinationUrl={destinationUrl}
        onCancel={() => setModalOpen(false)}
        onConfirm={submitDirect}
      />
    </div>
  );
}

export default function DirectQRPage() {
  return (
    <Suspense>
      <DirectQRForm />
    </Suspense>
  );
}
