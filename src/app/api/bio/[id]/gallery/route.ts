import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { isValidUUID } from '@/validations/qr';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_IMAGES = 12;

/**
 * POST /api/bio/[id]/gallery - Upload one or more gallery images
 *
 * Accepts multipart/form-data with one or more `files` fields.
 * Stores each image in the `bio-gallery` Supabase storage bucket.
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
      .select('id')
      .eq('id', id)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!page) {
      return NextResponse.json({ error: 'Bio page not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files');

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Too many files. Maximum is ${MAX_IMAGES}` },
        { status: 400 }
      );
    }

    // Validate each file
    for (const file of files) {
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Invalid file in upload' }, { status: 400 });
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Allowed: JPEG, PNG, WebP' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 2 MB' },
          { status: 400 }
        );
      }
    }

    // Upload each file
    const paths: string[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
      const uuid = crypto.randomUUID();
      const storagePath = `${user.id}/${id}/${uuid}.${ext}`;

      const buffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('bio-gallery')
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Gallery upload failed:', uploadError.message);
        return NextResponse.json(
          { error: 'Failed to upload image' },
          { status: 500 }
        );
      }

      paths.push(storagePath);
    }

    return NextResponse.json(
      { data: { paths } },
      { status: 201, headers: getRateLimitHeaders(rateLimit) }
    );

  } catch (error) {
    console.error('API error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
