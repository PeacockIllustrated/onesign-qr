import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { isValidUUID } from '@/validations/qr';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/brand/profiles/[id]/logo — upload brand logo
 * multipart/form-data with `file` field. Optional `variant=dark` for dark-bg logo.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rateLimit) });
  }

  const { data: profile } = await supabase
    .from('brand_profiles')
    .select('id, org_id, logo_storage_path, logo_dark_storage_path')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file');
  const variant = (formData.get('variant') as string | null) === 'dark' ? 'dark' : 'light';

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 });
  }

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1].replace('+xml', '');
  const filename = variant === 'dark' ? `logo-dark.${ext}` : `logo.${ext}`;
  const storagePath = `${profile.org_id}/profiles/${profile.id}/${filename}`;

  // Remove existing logo if path differs (different extension)
  const existing = variant === 'dark' ? profile.logo_dark_storage_path : profile.logo_storage_path;
  if (existing && existing !== storagePath) {
    await supabase.storage.from('brand-assets').remove([existing]);
  }

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('brand-assets')
    .upload(storagePath, buffer, { contentType: file.type, upsert: true });
  if (uploadError) {
    console.error('Logo upload failed:', uploadError.message);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }

  const updateField = variant === 'dark' ? 'logo_dark_storage_path' : 'logo_storage_path';
  const { error: updateError } = await supabase
    .from('brand_profiles')
    .update({ [updateField]: storagePath })
    .eq('id', profile.id);
  if (updateError) {
    return NextResponse.json({ error: 'Failed to save logo path' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(storagePath);
  return NextResponse.json(
    { storage_path: storagePath, public_url: urlData.publicUrl, variant },
    { headers: getRateLimitHeaders(rateLimit) }
  );
}

/**
 * DELETE /api/brand/profiles/[id]/logo?variant=light|dark
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const variant = url.searchParams.get('variant') === 'dark' ? 'dark' : 'light';
  const field = variant === 'dark' ? 'logo_dark_storage_path' : 'logo_storage_path';

  const { data: profile } = await supabase
    .from('brand_profiles')
    .select(`id, ${field}`)
    .eq('id', id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const existing = (profile as Record<string, unknown>)[field] as string | null;
  if (existing) {
    await supabase.storage.from('brand-assets').remove([existing]);
  }
  await supabase.from('brand_profiles').update({ [field]: null }).eq('id', id);
  return new NextResponse(null, { status: 204 });
}
