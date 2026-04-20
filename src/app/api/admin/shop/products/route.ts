import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPlatformAdmin } from '@/lib/admin/is-platform-admin';
import { createShopProductSchema } from '@/validations/shop';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await isPlatformAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parse = createShopProductSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parse.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: product, error } = await admin
    .from('shop_products')
    .insert({
      slug: parse.data.slug,
      sku: parse.data.sku ?? null,
      name: parse.data.name,
      description: parse.data.description ?? null,
      category: parse.data.category,
      base_price_pence: parse.data.base_price_pence,
      primary_image_url: parse.data.primary_image_url ?? null,
      gallery_image_urls: parse.data.gallery_image_urls ?? null,
      is_active: parse.data.is_active ?? true,
    })
    .select(
      'id, slug, sku, name, description, category, base_price_pence, primary_image_url, gallery_image_urls, is_active, created_at, updated_at, deleted_at'
    )
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json(
        { error: 'A product with that slug already exists' },
        { status: 409 }
      );
    }
    console.error('[admin shop products POST] insert failed', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }

  return NextResponse.json({ product }, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await isPlatformAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('shop_products')
    .select(
      'id, slug, sku, name, description, category, base_price_pence, primary_image_url, gallery_image_urls, is_active, created_at, updated_at, deleted_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load products' },
      { status: 500 }
    );
  }

  return NextResponse.json({ products: data ?? [] });
}
