import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClaudeConnectorSettings } from '@/components/settings/claude-connector-settings';

export default async function ClaudeSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, revoked_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

  return (
    <div className="p-6">
      <ClaudeConnectorSettings initialKeys={keys ?? []} mcpUrl={`${appUrl}/api/mcp`} />
    </div>
  );
}
