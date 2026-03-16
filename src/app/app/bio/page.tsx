'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Link2, ExternalLink, Eye, Palette, Loader2, Trash2 } from 'lucide-react';
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

      // Optimistic update: deactivate all, then activate the target
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">your bio pages</h1>
          <p className="text-muted-foreground">
            Manage your bio pages &mdash; only one can be live at a time
          </p>
        </div>
        {canCreate && (
          <Link href="/app/bio/new">
            <Button>
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
        <div className="space-y-4">
          {pages.map((page) => (
            <BioPageCard
              key={page.id}
              page={page}
              togglingId={togglingId}
              onToggle={toggleActive}
            />
          ))}

          {/* Page count hint */}
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
    <Card className="p-12">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-sm bg-muted mb-4">
          <Link2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">no bio pages yet</h2>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Create your first link-in-bio page to share all your important links in one
          place.
        </p>
        <Link href="/app/bio/new">
          <Button>
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
    <Card className="hover:border-foreground/20 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left side - Info */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold truncate">{page.title}</h3>
              <Badge variant={page.is_active ? 'success' : 'secondary'}>
                {page.is_active ? 'live' : 'draft'}
              </Badge>
            </div>

            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-1.5 font-mono text-xs">
                <Link2 className="h-3.5 w-3.5 shrink-0" />
                /p/{page.slug}
              </p>

              <p className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 shrink-0" />
                {themeDefinition?.name || page.theme} theme
              </p>

              <p className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 shrink-0" />
                {formatNumber(page.total_views)} views
              </p>

              <p className="text-xs">
                Created {formatDate(page.created_at)}
              </p>
            </div>
          </div>

          {/* Right side - Toggle */}
          <div className="shrink-0 pt-1">
            <button
              type="button"
              role="switch"
              aria-checked={page.is_active}
              aria-label={page.is_active ? 'Set to draft' : 'Set as live'}
              disabled={isToggling}
              onClick={() => onToggle(page.id, !page.is_active)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${page.is_active ? 'bg-green-600' : 'bg-muted'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm
                  ${page.is_active ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <Link href={`/app/bio/${page.id}`}>
            <Button variant="outline" size="sm">
              edit page
            </Button>
          </Link>
          {page.is_active && (
            <a href={pageUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
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
