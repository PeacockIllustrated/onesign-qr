import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { isValidUUID } from '@/validations/qr';

/**
 * PATCH /api/bio/[id]/submissions/[subId] - Toggle is_read on a submission
 *
 * Body: { is_read: boolean }
 * Auth + ownership required.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { id, subId } = await params;

  if (!isValidUUID(id) || !isValidUUID(subId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
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

    const body = await request.json();

    if (typeof body.is_read !== 'boolean') {
      return NextResponse.json(
        { error: 'is_read must be a boolean' },
        { status: 400 }
      );
    }

    const { data: submission, error: updateError } = await supabase
      .from('bio_form_submissions')
      .update({ is_read: body.is_read })
      .eq('id', subId)
      .eq('page_id', id)
      .select()
      .single();

    if (updateError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json(submission, {
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

/**
 * DELETE /api/bio/[id]/submissions/[subId] - Delete a submission
 *
 * Auth + ownership required.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { id, subId } = await params;

  if (!isValidUUID(id) || !isValidUUID(subId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
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

    const { error } = await supabase
      .from('bio_form_submissions')
      .delete()
      .eq('id', subId)
      .eq('page_id', id);

    if (error) {
      console.error('Failed to delete submission:', error.message);
      return NextResponse.json(
        { error: 'Failed to delete submission' },
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
