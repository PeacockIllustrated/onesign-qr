'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';

export function QRDeleteButton({ qrId, qrName }: { qrId: string; qrName: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Delete "${qrName}"? This action cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/qr/${qrId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      onClick={handleDelete}
      disabled={isDeleting}
      aria-label={`Delete ${qrName}`}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
