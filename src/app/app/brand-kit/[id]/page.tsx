import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { BrandProfileEditor } from '@/components/brand/brand-profile-editor';
import type { BrandProfile, BrandPerson, BrandDesign } from '@/types/brand';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BrandProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('brand_profiles')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !profile) notFound();

  const [{ data: people }, { data: designs }] = await Promise.all([
    supabase
      .from('brand_people')
      .select('*')
      .eq('brand_profile_id', id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('brand_designs')
      .select('*')
      .eq('brand_profile_id', id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
  ]);

  // Pre-compute logo public URL on the server.
  let logoUrl: string | null = null;
  if (profile.logo_storage_path) {
    const { data } = supabase.storage.from('brand-assets').getPublicUrl(profile.logo_storage_path);
    logoUrl = data.publicUrl ?? null;
  }

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      <Link
        href="/app/brand-kit"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Brand Kit
      </Link>

      <BrandProfileEditor
        profile={profile as BrandProfile}
        people={(people ?? []) as BrandPerson[]}
        designs={(designs ?? []) as BrandDesign[]}
        logoUrl={logoUrl}
      />
    </div>
  );
}
