import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

  // Resolve effective MIME: browser-reported MIME first, then fall back to the
  // filename extension. Some Windows browsers send an empty type for SVG.
  let effectiveMime = file.type;
  if (!effectiveMime || !ALLOWED_TYPES.includes(effectiveMime)) {
    const nameExt = file.name.split('.').pop()?.toLowerCase();
    const extToMime: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      svg: 'image/svg+xml',
      webp: 'image/webp',
    };
    if (nameExt && extToMime[nameExt]) {
      effectiveMime = extToMime[nameExt];
    }
  }
  if (!ALLOWED_TYPES.includes(effectiveMime)) {
    return NextResponse.json(
      { error: `Invalid file type: ${file.type || 'unknown'}. Allowed: PNG, JPG, SVG, WebP` },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 });
  }

  const ext = effectiveMime === 'image/jpeg' ? 'jpg' : effectiveMime.split('/')[1].replace('+xml', '');
  const filename = variant === 'dark' ? `logo-dark.${ext}` : `logo.${ext}`;
  const storagePath = `${profile.org_id}/profiles/${profile.id}/${filename}`;

  // Authorization happened above (brand_profiles SELECT under user-scoped
  // client respects org RLS). For the actual blob write we use the admin
  // client so the storage service doesn't re-run RLS — its handling of
  // SVG uploads under user-scoped JWTs returns spurious 400s in some
  // configurations even with valid permissions and allow-listed MIME.
  const admin = createAdminClient();

  // Remove existing logo if path differs (different extension)
  const existing = variant === 'dark' ? profile.logo_dark_storage_path : profile.logo_storage_path;
  if (existing && existing !== storagePath) {
    await admin.storage.from('brand-assets').remove([existing]);
  }

  // Re-wrap as a Blob with explicit MIME so the Content-Type header matches
  // what the storage service sees on the body. Buffer is fine here too.
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from('brand-assets')
    .upload(storagePath, buffer, { contentType: effectiveMime, upsert: true });
  if (uploadError) {
    console.error('Logo upload failed:', uploadError.message, '— path:', storagePath, 'mime:', effectiveMime);
    return NextResponse.json(
      { error: 'Failed to upload logo', details: uploadError.message },
      { status: 500 }
    );
  }

  const updateField = variant === 'dark' ? 'logo_dark_storage_path' : 'logo_storage_path';
  const { error: updateError } = await supabase
    .from('brand_profiles')
    .update({ [updateField]: storagePath })
    .eq('id', profile.id);
  if (updateError) {
    return NextResponse.json({ error: 'Failed to save logo path' }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from('brand-assets').getPublicUrl(storagePath);
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
    const admin = createAdminClient();
    await admin.storage.from('brand-assets').remove([existing]);
  }
  await supabase.from('brand_profiles').update({ [field]: null }).eq('id', id);
  return new NextResponse(null, { status: 204 });
}
