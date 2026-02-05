'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Link2, QrCode, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Button,
  Input,
  Label,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useToast,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui';
import { QRPreview } from '@/components/qr/qr-preview';
import { StylePanel } from '@/components/qr/style-panel';
import { validateUrl } from '@/lib/security/url-validator';
import { QR_DEFAULTS, ERROR_CORRECTION_LEVELS } from '@/lib/constants';
import type { QRStyleConfig, ErrorCorrectionLevel } from '@/types/qr';
import type { ModuleShape, EyeShape } from '@/lib/qr/shapes';

export default function NewQRPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const supabase = createClient();

  // Form state
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'managed' | 'direct'>('managed');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  // Style state
  const [style, setStyle] = useState<QRStyleConfig>({
    foregroundColor: '#000000',
    backgroundColor: '#FFFFFF',
    errorCorrection: 'M',
    quietZone: QR_DEFAULTS.QUIET_ZONE,
    moduleShape: 'square',
    eyeShape: 'square',
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Validate URL on change
  useEffect(() => {
    if (!destinationUrl) {
      setUrlError(null);
      return;
    }

    const result = validateUrl(destinationUrl);
    setUrlError(result.isValid ? null : result.error || 'Invalid URL');
  }, [destinationUrl]);

  // Generate preview URL
  const previewUrl = mode === 'managed'
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}/r/${slug || 'preview'}`
    : destinationUrl;

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate slug if managed mode and not provided
      let finalSlug = slug;
      if (mode === 'managed' && !finalSlug) {
        // Generate a random 8-character slug
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        finalSlug = Array.from({ length: 8 }, () =>
          chars.charAt(Math.floor(Math.random() * chars.length))
        ).join('');
      }

      // Create QR code
      const { data: qr, error: createError } = await supabase
        .from('qr_codes')
        .insert({
          owner_id: user.id,
          name,
          mode,
          slug: mode === 'managed' ? finalSlug : null,
          destination_url: destinationUrl,
          analytics_enabled: mode === 'managed' ? analyticsEnabled : false,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update style
      const { error: styleError } = await supabase
        .from('qr_styles')
        .update({
          foreground_color: style.foregroundColor,
          background_color: style.backgroundColor,
          error_correction: style.errorCorrection,
          quiet_zone: style.quietZone,
          module_shape: style.moduleShape,
          eye_shape: style.eyeShape,
        })
        .eq('qr_id', qr.id);

      if (styleError) throw styleError;

      addToast({ title: 'QR code created!', variant: 'success' });
      router.push(`/app/qr/${qr.id}`);
    } catch (error: any) {
      console.error('Error creating QR:', error);
      addToast({
        title: 'Failed to create QR code',
        description: error.message,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          back to dashboard
        </Link>
        <h1 className="text-2xl font-bold">create new qr code</h1>
        <p className="text-muted-foreground">
          Configure your QR code settings and style
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left column - Form */}
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">basic info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Menu QR, Store Window"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mode">qr type</Label>
                  <Select
                    id="mode"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as 'managed' | 'direct')}
                  >
                    <option value="managed">Managed Link (recommended)</option>
                    <option value="direct">Direct URL</option>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {mode === 'managed'
                      ? 'QR points to our redirect service. You can change the destination anytime.'
                      : 'QR encodes the full URL directly. Cannot be changed after printing.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Destination */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">destination</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">destination url *</Label>
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

                {mode === 'managed' && (
                  <div className="space-y-2">
                    <Label htmlFor="slug">custom slug (optional)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground shrink-0">
                        /r/
                      </span>
                      <Input
                        id="slug"
                        placeholder="auto-generated"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave empty to auto-generate. Use lowercase letters, numbers, and hyphens.
                    </p>
                  </div>
                )}

                {mode === 'managed' && (
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
                )}
              </CardContent>
            </Card>

            {/* Style */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">style</CardTitle>
              </CardHeader>
              <CardContent>
                <StylePanel style={style} onChange={setStyle} />
              </CardContent>
            </Card>
          </div>

          {/* Right column - Preview */}
          <div className="lg:sticky lg:top-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">preview</CardTitle>
              </CardHeader>
              <CardContent>
                <QRPreview
                  data={previewUrl || 'https://example.com'}
                  style={style}
                />
                <p className="mt-4 text-xs text-center text-muted-foreground">
                  {mode === 'managed' ? 'QR encodes your managed link' : 'QR encodes the destination URL directly'}
                </p>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Link href="/app" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={isLoading || !!urlError}>
                {isLoading ? 'creating...' : 'create qr code'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
