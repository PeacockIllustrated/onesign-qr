'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Copy, Download, Settings, BarChart3, History } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Input,
  Label,
  useToast,
} from '@/components/ui';
import { QRPreview } from './qr-preview';
import { StylePanel } from './style-panel';
import { ExportPanel } from './export-panel';
import type { QRStyleConfig, ErrorCorrectionLevel } from '@/types/qr';
import type { ModuleShape, EyeShape } from '@/lib/qr/shapes';

interface QRDetailClientProps {
  qr: any;
  style: any;
  redirectUrl: string | null;
}

export function QRDetailClient({ qr, style: initialStyle, redirectUrl }: QRDetailClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const supabase = createClient();

  // State
  const [destinationUrl, setDestinationUrl] = useState(qr.destination_url);
  const [isUpdating, setIsUpdating] = useState(false);
  const [style, setStyle] = useState<QRStyleConfig>({
    foregroundColor: initialStyle?.foreground_color || '#000000',
    backgroundColor: initialStyle?.background_color || '#FFFFFF',
    errorCorrection: (initialStyle?.error_correction || 'M') as ErrorCorrectionLevel,
    quietZone: initialStyle?.quiet_zone || 4,
    moduleShape: (initialStyle?.module_shape || 'square') as ModuleShape,
    eyeShape: (initialStyle?.eye_shape || 'square') as EyeShape,
  });

  const qrData = qr.mode === 'managed' && redirectUrl
    ? redirectUrl
    : qr.destination_url;

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    addToast({ title: 'Copied to clipboard', variant: 'success' });
  };

  const updateDestination = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('qr_codes')
        .update({ destination_url: destinationUrl })
        .eq('id', qr.id);

      if (error) throw error;

      addToast({ title: 'Destination updated', variant: 'success' });
      router.refresh();
    } catch (error: any) {
      addToast({
        title: 'Failed to update',
        description: error.message,
        variant: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateStyle = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
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

      if (error) throw error;

      addToast({ title: 'Style updated', variant: 'success' });
      router.refresh();
    } catch (error: any) {
      addToast({
        title: 'Failed to update style',
        description: error.message,
        variant: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Left column - Preview and export */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">qr code</CardTitle>
          </CardHeader>
          <CardContent>
            <QRPreview data={qrData} style={style} size={300} />
          </CardContent>
        </Card>

        <ExportPanel qrId={qr.id} data={qrData} style={style} />
      </div>

      {/* Right column - Tabs */}
      <div className="lg:col-span-2">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">overview</TabsTrigger>
            <TabsTrigger value="destination">destination</TabsTrigger>
            <TabsTrigger value="style">style</TabsTrigger>
            {qr.analytics_enabled && (
              <TabsTrigger value="analytics">analytics</TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Managed Link */}
                {redirectUrl && (
                  <div className="space-y-2">
                    <Label>managed link</Label>
                    <div className="flex gap-2">
                      <Input value={redirectUrl} readOnly className="font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(redirectUrl)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <a href={redirectUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This is the URL encoded in your QR code
                    </p>
                  </div>
                )}

                {/* Destination */}
                <div className="space-y-2">
                  <Label>destination url</Label>
                  <div className="flex gap-2">
                    <Input
                      value={qr.destination_url}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(qr.destination_url)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <a href={qr.destination_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {qr.mode === 'managed'
                      ? 'Visitors are redirected to this URL'
                      : 'This URL is encoded directly in the QR code'}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">created</p>
                    <p className="font-medium">{new Date(qr.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">total scans</p>
                    <p className="font-medium">{qr.total_scans}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Destination Tab */}
          <TabsContent value="destination">
            <Card>
              <CardContent className="pt-6 space-y-4">
                {qr.mode === 'managed' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="dest-url">destination url</Label>
                      <Input
                        id="dest-url"
                        value={destinationUrl}
                        onChange={(e) => setDestinationUrl(e.target.value)}
                        placeholder="https://example.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Change where your QR code redirects without reprinting
                      </p>
                    </div>
                    <Button
                      onClick={updateDestination}
                      disabled={isUpdating || destinationUrl === qr.destination_url}
                    >
                      {isUpdating ? 'updating...' : 'update destination'}
                    </Button>
                  </>
                ) : (
                  <div className="p-4 bg-muted rounded-sm">
                    <p className="text-sm text-muted-foreground">
                      This is a direct QR code. The destination URL is encoded directly
                      in the QR code and cannot be changed without generating a new code.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Style Tab */}
          <TabsContent value="style">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <StylePanel style={style} onChange={setStyle} />
                <Button onClick={updateStyle} disabled={isUpdating}>
                  {isUpdating ? 'saving...' : 'save style changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          {qr.analytics_enabled && (
            <TabsContent value="analytics">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Analytics coming soon</p>
                    <p className="text-sm mt-2">
                      Total scans: {qr.total_scans}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
