import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('organization_invites')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[invites DELETE] failed', error);
    return NextResponse.json(
      { error: 'Failed to cancel invite' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
