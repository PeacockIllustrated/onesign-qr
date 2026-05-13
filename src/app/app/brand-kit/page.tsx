import { Palette } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui';
import { CreateBrandProfileButton } from '@/components/brand/create-brand-profile-button';
import { BrandProfileCard } from '@/components/brand/brand-profile-card';

export default async function BrandKitPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from('brand_profiles')
    .select('id, name, tagline, primary_color, secondary_color, accent_color, logo_storage_path, updated_at')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Brand Kit</h1>
          <p className="text-sm text-zinc-400 mt-1">
            One brand identity, many outputs — business cards, email signatures and more.
          </p>
        </div>
        <CreateBrandProfileButton />
      </div>

      {(!profiles || profiles.length === 0) ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Palette className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
            <h2 className="text-base font-medium text-zinc-100">No brand profiles yet</h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
              Start by creating a brand profile. Add your logo, colours and contact details,
              then stamp them onto business cards and email signatures.
            </p>
            <div className="mt-6">
              <CreateBrandProfileButton />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((p) => (
            <BrandProfileCard key={p.id} profile={p} />
          ))}
        </div>
      )}
    </div>
  );
}
