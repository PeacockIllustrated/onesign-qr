import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkBioFormSubmitLimitAsync, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { z } from 'zod';
import crypto from 'crypto';

const formSubmissionSchema = z.object({
  block_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  message: z.string().min(1).max(2000),
  phone: z.string().max(50).optional(),
  subject: z.string().max(200).optional(),
});

/**
 * POST /api/bio/[id]/form - Submit a contact form (public, unauthenticated)
 *
 * Uses admin client to bypass RLS (same pattern as /api/bio/track).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pageId } = await params;

  // Basic UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(pageId)) {
    return NextResponse.json({ error: 'Invalid page ID' }, { status: 400 });
  }

  // Rate limit by hashed IP + page ID
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const ipHash = crypto
    .createHash('sha256')
    .update(ip + (process.env.IP_HASH_SALT || ''))
    .digest('hex')
    .substring(0, 16);

  const rateLimit = await checkBioFormSubmitLimitAsync(`${ipHash}:${pageId}`);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await request.json();

    const parsed = formSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { block_id, name, email, message, phone, subject } = parsed.data;

    const supabase = createAdminClient();

    // Verify page exists, is active, and not deleted
    const { data: page, error: pageError } = await supabase
      .from('bio_link_pages')
      .select('id, owner_id, contact_email')
      .eq('id', pageId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Verify block belongs to page and is a contact_form type
    const { data: block, error: blockError } = await supabase
      .from('bio_blocks')
      .select('id, block_type')
      .eq('id', block_id)
      .eq('page_id', pageId)
      .single();

    if (blockError || !block || block.block_type !== 'contact_form') {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Insert submission
    const { error: insertError } = await supabase
      .from('bio_form_submissions')
      .insert({
        page_id: pageId,
        block_id,
        name,
        email,
        message,
        phone: phone || null,
        subject: subject || null,
        ip_hash: ipHash,
      });

    if (insertError) {
      console.error('Failed to insert form submission:', insertError.message);
      return NextResponse.json(
        { error: 'Failed to submit form' },
        { status: 500 }
      );
    }

    // Email notification (fire-and-forget)
    if (process.env.RESEND_API_KEY) {
      try {
        // Determine recipient: page contact_email or owner's auth email
        let recipientEmail = page.contact_email;
        if (!recipientEmail) {
          const { data: authUser } = await supabase.auth.admin.getUserById(page.owner_id);
          recipientEmail = authUser?.user?.email || null;
        }

        if (recipientEmail) {
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'OneSign <noreply@onesign.app>',
              to: [recipientEmail],
              subject: subject
                ? `New form submission: ${subject}`
                : `New contact form submission from ${name}`,
              html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
                ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
              `.trim(),
            }),
          }).catch(() => {
            // Silently ignore email errors
          });
        }
      } catch {
        // Silently skip on any error
      }
    }

    return NextResponse.json(
      { success: true },
      { status: 201, headers: getRateLimitHeaders(rateLimit) }
    );
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
