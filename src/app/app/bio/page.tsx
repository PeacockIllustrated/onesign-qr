'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Link2, ExternalLink, Eye, Palette, Loader2 } from 'lucide-react';
import { Button, Card, CardContent, Badge, useToast } from '@/components/ui';
import { formatDate, formatNumber } from '@/lib/utils';
import { BIO_THEME_DEFINITIONS } from '@/lib/bio/themes';
import { BIO_DEFAULTS } from '@/lib/constants';
import type { BioLinkPage } from '@/types/bio';

export default function BioPage() {
  const [pages, setPages] = useState<BioLinkPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchPages();
  }, []);

  async function fetchPages() {
    try {
      const res = await fetch('/api/bio');
      const json = await res.json();
      setPages(json.data || []);
    } catch {
      addToast({ title: 'Failed to load bio pages', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(pageId: string, activate: boolean) {
    setTogglingId(pageId);
    try {
      const res = await fetch(`/api/bio/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: activate }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      setPages((prev) =>
        prev.map((p) => ({
          ...p,
          is_active: activate ? p.id === pageId : p.id === pageId ? false : p.is_active,
        }))
      );

      addToast({
        title: activate ? 'Page is now live' : 'Page set to draft',
        variant: 'success',
      });
    } catch (error: any) {
      addToast({ title: error.message, variant: 'error' });
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canCreate = pages.length < BIO_DEFAULTS.MAX_PAGES_PER_USER;

  return (
    <div className="p-4 md:p-8">
      {/* Header — stacks on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">your bio pages</h1>
          <p className="text-sm text-muted-foreground">
            Only one can be live at a time
          </p>
        </div>
        {canCreate && (
          <Link href="/app/bio/new" className="shrink-0">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              new page
            </Button>
          </Link>
        )}
      </div>

      {/* Content */}
      {pages.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {pages.map((page) => (
            <BioPageCard
              key={page.id}
              page={page}
              togglingId={togglingId}
              onToggle={toggleActive}
            />
          ))}

          <p className="text-xs text-muted-foreground text-right">
            {pages.length} / {BIO_DEFAULTS.MAX_PAGES_PER_USER} pages
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="p-8 sm:p-12">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-sm bg-muted mb-4">
          <Link2 className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-medium mb-2">no bio pages yet</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          Create your first link-in-bio page to share all your important links in one place.
        </p>
        <Link href="/app/bio/new">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            create your bio page
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function BioPageCard({
  page,
  togglingId,
  onToggle,
}: {
  page: BioLinkPage;
  togglingId: string | null;
  onToggle: (id: string, activate: boolean) => void;
}) {
  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/p/${page.slug}`;
  const themeDefinition = BIO_THEME_DEFINITIONS[page.theme];
  const isToggling = togglingId === page.id;

  return (
    <Card className="hover:border-foreground/20 transition-colors active:scale-[0.995]">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          {/* Info */}
          <div className="space-y-2.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-medium truncate">{page.title}</h3>
              <Badge variant={page.is_active ? 'success' : 'secondary'}>
                {page.is_active ? 'live' : 'draft'}
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-1.5 font-mono text-xs truncate">
                <Link2 className="h-3.5 w-3.5 shrink-0" />
                /p/{page.slug}
              </p>

              <div className="flex items-center gap-3 flex-wrap text-xs">
                <span className="flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  {themeDefinition?.name || page.theme}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatNumber(page.total_views)}
                </span>
                <span className="hidden sm:inline">
                  {formatDate(page.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Toggle — 44px touch target */}
          <div className="shrink-0">
            <button
              type="button"
              role="switch"
              aria-checked={page.is_active}
              aria-label={page.is_active ? 'Set to draft' : 'Set as live'}
              disabled={isToggling}
              onClick={() => onToggle(page.id, !page.is_active)}
              className={`
                relative inline-flex h-7 w-12 items-center rounded-full transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${page.is_active ? 'bg-green-600' : 'bg-muted'}
              `}
            >
              <span
                className={`
                  inline-block h-5 w-5 rounded-full bg-white transition-transform shadow-sm
                  ${page.is_active ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>

        {/* Actions — full-width on mobile */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Link href={`/app/bio/${page.id}`} className="flex-1 sm:flex-none">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              edit page
            </Button>
          </Link>
          {page.is_active && (
            <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                view live
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
