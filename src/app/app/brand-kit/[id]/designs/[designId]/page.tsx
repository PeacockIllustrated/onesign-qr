import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { hydrateBrandDesign } from '@/lib/brand/hydrate';
import { BrandDesignEditor } from '@/components/brand/brand-design-editor';
import type { BrandPerson } from '@/types/brand';

interface PageProps {
  params: Promise<{ id: string; designId: string }>;
}

export default async function BrandDesignPage({ params }: PageProps) {
  const { id: profileId, designId } = await params;
  const supabase = await createClient();

  const { data: design, error } = await supabase
    .from('brand_designs')
    .select('*')
    .eq('id', designId)
    .eq('brand_profile_id', profileId)
    .is('deleted_at', null)
    .single();

  if (error || !design) notFound();

  const hydrated = await hydrateBrandDesign(supabase, design);

  const { data: people } = await supabase
    .from('brand_people')
    .select('*')
    .eq('brand_profile_id', profileId)
    .order('sort_order', { ascending: true });

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      <Link
        href={`/app/brand-kit/${profileId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to brand
      </Link>

      <BrandDesignEditor design={hydrated} people={(people ?? []) as BrandPerson[]} />
    </div>
  );
}
