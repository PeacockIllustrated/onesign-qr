import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { orgSwitchSchema } from '@/validations/org-switch';
import {
  isValidOrgForUser,
  setActiveOrgCookie,
} from '@/lib/org/active-org';

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parse = orgSwitchSchema.safeParse(parsedBody);
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parse.error.flatten() },
      { status: 400 }
    );
  }

  const { orgId } = parse.data;

  const valid = await isValidOrgForUser(supabase, user.id, orgId);
  if (!valid) {
    return NextResponse.json(
      { error: 'Not a member of that organisation' },
      { status: 403 }
    );
  }

  await setActiveOrgCookie(orgId);
  return NextResponse.json({ ok: true, orgId });
}
