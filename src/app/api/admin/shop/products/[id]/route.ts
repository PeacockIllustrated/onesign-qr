import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPlatformAdmin } from '@/lib/admin/is-platform-admin';
import { updateShopProductSchema } from '@/validations/shop';

async function requireAdmin(): Promise<
  { error: Response } | { userId: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const ok = await isPlatformAdmin(user.id);
  if (!ok) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { userId: user.id };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if ('error' in gate) return gate.error;
  const { id } = await params;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('shop_products')
    .select(
      'id, slug, sku, name, description, category, base_price_pence, primary_image_url, gallery_image_urls, is_active, created_at, updated_at, deleted_at'
    )
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ product: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if ('error' in gate) return gate.error;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parse = updateShopProductSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parse.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('shop_products')
    .update(parse.data)
    .eq('id', id)
    .select(
      'id, slug, sku, name, description, category, base_price_pence, primary_image_url, gallery_image_urls, is_active, created_at, updated_at, deleted_at'
    )
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  return NextResponse.json({ product: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if ('error' in gate) return gate.error;
  const { id } = await params;

  const admin = createAdminClient();
  const { error } = await admin
    .from('shop_products')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
