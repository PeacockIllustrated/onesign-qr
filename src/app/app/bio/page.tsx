import Link from 'next/link';
import { Plus, Link2, ExternalLink, Eye, Palette } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardContent, Badge } from '@/components/ui';
import { formatDate, formatNumber } from '@/lib/utils';
import { BIO_THEME_DEFINITIONS } from '@/lib/bio/themes';
import type { BioLinkPage } from '@/types/bio';

export default async function BioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: page, error } = await supabase
    .from('bio_link_pages')
    .select('*')
    .eq('owner_id', user!.id)
    .is('deleted_at', null)
    .single();

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">your bio page</h1>
          <p className="text-muted-foreground">
            Manage your personal link-in-bio page
          </p>
        </div>
      </div>

      {/* Content */}
      {error || !page ? (
        <EmptyState />
      ) : (
        <BioPageCard page={page as BioLinkPage} />
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
        <h2 className="text-lg font-semibold mb-2">no bio page yet</h2>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Create your link-in-bio page to share all your important links in one
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

function BioPageCard({ page }: { page: BioLinkPage }) {
  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/p/${page.slug}`;
  const themeDefinition = BIO_THEME_DEFINITIONS[page.theme];

  return (
    <Card className="hover:border-foreground/20 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left side - Info */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold truncate">{page.title}</h3>
              <Badge variant={page.is_active ? 'success' : 'secondary'}>
                {page.is_active ? 'active' : 'inactive'}
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
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <Link href={`/app/bio/${page.id}`}>
            <Button variant="outline" size="sm">
              edit page
            </Button>
          </Link>
          <a href={pageUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              view live
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
