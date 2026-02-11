'use client';

import { useState } from 'react';
import { QrCode, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface BioQrConnectProps {
  pageId: string;
  qrCodeId: string | null;
  pageSlug: string;
}

export function BioQrConnect({ pageId, qrCodeId, pageSlug }: BioQrConnectProps) {
  const [loading, setLoading] = useState(false);
  const [linkedQrId, setLinkedQrId] = useState(qrCodeId);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/bio/${pageId}/qr`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to generate QR');
        return;
      }

      const data = await res.json();
      setLinkedQrId(data.qr_code_id);
    } catch {
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  if (linkedQrId) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <QrCode className="h-4 w-4" />
          <span>QR code linked</span>
        </div>
        <div className="flex gap-2">
          <a
            href={`/app/qr/${linkedQrId}`}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
          >
            View QR Details
          </a>
          <a
            href={`/p/${pageSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-sm text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-9 px-3"
          >
            Preview Page
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Generate a QR code that links to your bio page. Anyone who scans it will
        land on your page at /p/{pageSlug}.
      </p>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button onClick={handleGenerate} disabled={loading} size="sm">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <QrCode className="h-4 w-4 mr-2" />
            Generate QR Code
          </>
        )}
      </Button>
    </div>
  );
}
