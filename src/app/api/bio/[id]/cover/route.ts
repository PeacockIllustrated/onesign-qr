import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { isValidUUID } from '@/validations/qr';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB (covers are larger than avatars)

/**
 * POST /api/bio/[id]/cover - Upload or replace cover/banner image
 *
 * Accepts multipart/form-data with a single `file` field.
 * Stores the image in the `bio-avatars` Supabase storage bucket.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid bio page ID' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    // Verify page ownership
    const { data: page } = await supabase
      .from('bio_link_pages')
      .select('id, cover_storage_path')
      .eq('id', id)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!page) {
      return NextResponse.json({ error: 'Bio page not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5 MB' },
        { status: 400 }
      );
    }

    // Build storage path: {user_id}/{page_id}/cover.{ext}
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    const storagePath = `${user.id}/${id}/cover.${ext}`;

    // Delete old cover if it exists and has a different path
    if (page.cover_storage_path && page.cover_storage_path !== storagePath) {
      await supabase.storage
        .from('bio-avatars')
        .remove([page.cover_storage_path]);
    }

    // Upload new cover (upsert = overwrite if same path)
    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('bio-avatars')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Cover upload failed:', uploadError.message);
      return NextResponse.json(
        { error: 'Failed to upload cover image' },
        { status: 500 }
      );
    }

    // Update the page record with the storage path
    const { error: updateError } = await supabase
      .from('bio_link_pages')
      .update({ cover_storage_path: storagePath })
      .eq('id', id)
      .eq('owner_id', user.id);

    if (updateError) {
      console.error('Failed to update cover path:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to save cover image' },
        { status: 500 }
      );
    }

    // Return the public URL
    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bio-avatars/${storagePath}`;

    return NextResponse.json(
      { cover_url: publicUrl, cover_storage_path: storagePath },
      { headers: getRateLimitHeaders(rateLimit) }
    );

  } catch (error) {
    console.error('API error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bio/[id]/cover - Remove the cover/banner image
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid bio page ID' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    // Verify page ownership
    const { data: page } = await supabase
      .from('bio_link_pages')
      .select('id, cover_storage_path')
      .eq('id', id)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!page) {
      return NextResponse.json({ error: 'Bio page not found' }, { status: 404 });
    }

    // Delete from storage if exists
    if (page.cover_storage_path) {
      await supabase.storage
        .from('bio-avatars')
        .remove([page.cover_storage_path]);
    }

    // Clear the path in the database
    const { error: updateError } = await supabase
      .from('bio_link_pages')
      .update({ cover_storage_path: null })
      .eq('id', id)
      .eq('owner_id', user.id);

    if (updateError) {
      console.error('Failed to clear cover path:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to remove cover image' },
        { status: 500 }
      );
    }

    return new NextResponse(null, {
      status: 204,
      headers: getRateLimitHeaders(rateLimit),
    });

  } catch (error) {
    console.error('API error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
