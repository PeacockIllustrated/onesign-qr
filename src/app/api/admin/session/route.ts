import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminLoginSchema } from '@/validations/admin';
import { isPlatformAdmin } from '@/lib/admin/is-platform-admin';
import {
  setAdminSession,
  clearAdminSession,
} from '@/lib/admin/admin-session';
import { logAdminAction } from '@/lib/admin/audit';

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parse = adminLoginSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const isAdmin = await isPlatformAdmin(user.id);
  if (!isAdmin) {
    await logAdminAction({
      actorUserId: user.id,
      action: 'admin_session.denied_not_admin',
    });
    return NextResponse.json(
      { error: 'Not a platform admin' },
      { status: 403 }
    );
  }

  // Step-up re-auth via password. Creates a fresh Supabase session but the
  // SSR cookie handler persists the new access token transparently.
  const { error: signinError } = await supabase.auth.signInWithPassword({
    email: user.email ?? '',
    password: parse.data.password,
  });

  if (signinError) {
    await logAdminAction({
      actorUserId: user.id,
      action: 'admin_session.failed',
      metadata: { reason: signinError.message },
    });
    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    );
  }

  await setAdminSession(user.id);
  await logAdminAction({
    actorUserId: user.id,
    action: 'admin_session.created',
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logAdminAction({
      actorUserId: user.id,
      action: 'admin_session.cleared',
    });
  }
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
