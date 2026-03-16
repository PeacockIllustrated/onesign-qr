import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui';
import { BioDetailClient } from '@/components/bio/bio-detail-client';
import type { BioLinkPage, BioLinkItem, BioBlock } from '@/types/bio';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BioDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: page, error } = await supabase
    .from('bio_link_pages')
    .select('*, bio_link_items(*)')
    .eq('id', id)
    .eq('owner_id', user!.id)
    .is('deleted_at', null)
    .order('sort_order', { referencedTable: 'bio_link_items', ascending: true })
    .single();

  if (error || !page) {
    notFound();
  }

  const bioPage = page as BioLinkPage & { bio_link_items: BioLinkItem[] };

  // Fetch blocks for grid mode (gracefully handle missing table)
  let blocks: BioBlock[] = [];
  if (bioPage.layout_mode === 'grid') {
    try {
      const { data: blockData, error: blockError } = await supabase
        .from('bio_blocks')
        .select('*')
        .eq('page_id', id)
        .order('grid_row', { ascending: true })
        .order('grid_col', { ascending: true });

      if (!blockError) {
        blocks = (blockData as BioBlock[]) || [];
      }
    } catch {
      // bio_blocks table may not exist yet (migration pending)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/app/bio"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          back to bio page
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{bioPage.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant={bioPage.is_active ? 'success' : 'secondary'}>
                {bioPage.is_active ? 'active' : 'inactive'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Client component for interactive features */}
      <BioDetailClient
        page={bioPage}
        items={bioPage.bio_link_items || []}
        blocks={blocks}
      />
    </div>
  );
}
