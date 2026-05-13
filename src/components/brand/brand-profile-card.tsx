'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, Button, useToast } from '@/components/ui';
import { formatDate } from '@/lib/utils';

interface Props {
  profile: {
    id: string;
    name: string;
    tagline: string | null;
    primary_color: string;
    secondary_color: string;
    accent_color: string | null;
    updated_at: string;
  };
}

/**
 * Brand profile card on the /app/brand-kit list page. Click to enter,
 * hover to reveal a delete button. Deletion is soft (sets deleted_at).
 */
export function BrandProfileCard({ profile: p }: Props) {
  const router = useRouter();
  const { addToast } = useToast();

  async function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete brand profile "${p.name}"? Designs and uploaded assets will be removed too.`)) return;
    try {
      const res = await fetch(`/api/brand/profiles/${p.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.details ?? body?.error ?? `HTTP ${res.status}`);
      }
      addToast({ title: 'Brand deleted', variant: 'success' });
      router.refresh();
    } catch (err: any) {
      addToast({ title: 'Delete failed', description: err.message, variant: 'error' });
    }
  }

  return (
    <div className="relative group">
      <Link href={`/app/brand-kit/${p.id}`}>
        <Card className="hover:border-lynx-400/40 transition-colors h-full">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              {/* Colour swatches */}
              <div className="flex flex-col gap-1 shrink-0">
                <div className="h-6 w-6 rounded-sm border border-zinc-700" style={{ backgroundColor: p.primary_color }} />
                <div className="h-6 w-6 rounded-sm border border-zinc-700" style={{ backgroundColor: p.secondary_color }} />
                {p.accent_color && (
                  <div className="h-6 w-6 rounded-sm border border-zinc-700" style={{ backgroundColor: p.accent_color }} />
                )}
              </div>
              <div className="min-w-0 flex-1 pr-8">
                <h3 className="text-base font-medium text-zinc-100 truncate">{p.name}</h3>
                {p.tagline && (
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{p.tagline}</p>
                )}
                <p className="text-xs text-zinc-500 mt-3">
                  Updated {formatDate(p.updated_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Delete ${p.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
