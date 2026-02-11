import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { isValidUUID } from '@/validations/qr';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
const MAX_FILE_SIZE = 512 * 1024; // 512 KB — favicons are small

/**
 * POST /api/bio/[id]/favicon - Upload or replace the page favicon
 *
 * Accepts multipart/form-data with a single `file` field.
 * Stores the image in the `bio-avatars` Supabase storage bucket under a /favicon/ sub-path.
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
      .select('id, favicon_storage_path')
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
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, SVG, ICO' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 512 KB' },
        { status: 400 }
      );
    }

    // Build storage path: {user_id}/{page_id}/favicon.{ext}
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'image/x-icon': 'ico',
      'image/vnd.microsoft.icon': 'ico',
    };
    const ext = extMap[file.type] ?? 'png';
    const storagePath = `${user.id}/${id}/favicon.${ext}`;

    // Delete old favicon if it exists and has a different path
    if (page.favicon_storage_path && page.favicon_storage_path !== storagePath) {
      await supabase.storage
        .from('bio-avatars')
        .remove([page.favicon_storage_path]);
    }

    // Upload new favicon (upsert = overwrite if same path)
    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('bio-avatars')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Favicon upload failed:', uploadError.message);
      return NextResponse.json(
        { error: 'Failed to upload favicon' },
        { status: 500 }
      );
    }

    // Update the page record with the storage path
    const { error: updateError } = await supabase
      .from('bio_link_pages')
      .update({ favicon_storage_path: storagePath })
      .eq('id', id)
      .eq('owner_id', user.id);

    if (updateError) {
      console.error('Failed to update favicon path:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to save favicon' },
        { status: 500 }
      );
    }

    // Return the public URL
    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bio-avatars/${storagePath}`;

    return NextResponse.json(
      { favicon_url: publicUrl, favicon_storage_path: storagePath },
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
 * DELETE /api/bio/[id]/favicon - Remove the page favicon
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
      .select('id, favicon_storage_path')
      .eq('id', id)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!page) {
      return NextResponse.json({ error: 'Bio page not found' }, { status: 404 });
    }

    // Delete from storage if exists
    if (page.favicon_storage_path) {
      await supabase.storage
        .from('bio-avatars')
        .remove([page.favicon_storage_path]);
    }

    // Clear the path in the database
    const { error: updateError } = await supabase
      .from('bio_link_pages')
      .update({ favicon_storage_path: null })
      .eq('id', id)
      .eq('owner_id', user.id);

    if (updateError) {
      console.error('Failed to clear favicon path:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to remove favicon' },
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
