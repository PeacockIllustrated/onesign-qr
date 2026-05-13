import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { isValidUUID } from '@/validations/qr';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/brand/people/[id]/photo — upload person headshot.
 * Stored at brand-assets/{org_id}/people/{person_id}/photo.{ext}.
 *
 * Authorization happens via the user-scoped brand_people SELECT under RLS;
 * the storage write uses the admin client (same pattern as brand profile
 * logo upload).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid person ID' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rateLimit) });
  }

  // Auth via user-scoped client. The brand_people RLS policy requires the
  // caller to be a member of the parent profile's org, so a successful SELECT
  // already proves authorisation. We then fetch org_id from the profile in a
  // separate query to keep the response shape predictable (the join-embed
  // form has burned us with shape inconsistencies before).
  const { data: person, error: personErr } = await supabase
    .from('brand_people')
    .select('id, photo_storage_path, brand_profile_id')
    .eq('id', id)
    .single();

  if (personErr || !person) {
    return NextResponse.json({ error: 'Person not found', details: personErr?.message }, { status: 404 });
  }

  const { data: parent, error: parentErr } = await supabase
    .from('brand_profiles')
    .select('org_id')
    .eq('id', person.brand_profile_id)
    .single();

  if (parentErr || !parent) {
    return NextResponse.json({ error: 'Parent profile not found', details: parentErr?.message }, { status: 404 });
  }

  const orgId = parent.org_id;

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  let effectiveMime = file.type;
  if (!effectiveMime || !ALLOWED_TYPES.includes(effectiveMime)) {
    const nameExt = file.name.split('.').pop()?.toLowerCase();
    const extToMime: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };
    if (nameExt && extToMime[nameExt]) effectiveMime = extToMime[nameExt];
  }
  if (!ALLOWED_TYPES.includes(effectiveMime)) {
    return NextResponse.json(
      { error: `Invalid file type: ${file.type || 'unknown'}. Allowed: PNG, JPG, WebP` },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 });
  }

  const ext = effectiveMime === 'image/jpeg' ? 'jpg' : effectiveMime.split('/')[1];
  const storagePath = `${orgId}/people/${person.id}/photo.${ext}`;

  const admin = createAdminClient();

  if (person.photo_storage_path && person.photo_storage_path !== storagePath) {
    await admin.storage.from('brand-assets').remove([person.photo_storage_path]);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from('brand-assets')
    .upload(storagePath, buffer, { contentType: effectiveMime, upsert: true });
  if (uploadError) {
    console.error('Photo upload failed:', uploadError.message);
    return NextResponse.json(
      { error: 'Failed to upload photo', details: uploadError.message },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from('brand_people')
    .update({ photo_storage_path: storagePath })
    .eq('id', person.id);
  if (updateError) {
    return NextResponse.json({ error: 'Failed to save photo path' }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from('brand-assets').getPublicUrl(storagePath);
  return NextResponse.json(
    { storage_path: storagePath, public_url: urlData.publicUrl },
    { headers: getRateLimitHeaders(rateLimit) }
  );
}

/**
 * DELETE /api/brand/people/[id]/photo
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid person ID' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: person } = await supabase
    .from('brand_people')
    .select('id, photo_storage_path')
    .eq('id', id)
    .single();
  if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 });

  if (person.photo_storage_path) {
    const admin = createAdminClient();
    await admin.storage.from('brand-assets').remove([person.photo_storage_path]);
  }
  await supabase.from('brand_people').update({ photo_storage_path: null }).eq('id', id);
  return new NextResponse(null, { status: 204 });
}
