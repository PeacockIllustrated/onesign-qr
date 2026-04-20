export interface SendInviteArgs {
  to: string;
  orgName: string;
  inviterName: string;
  token: string;
}

export interface SendInviteResult {
  sent: boolean;
}

export function buildAcceptUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/invite/${token}`;
}

export async function sendInviteEmail(
  args: SendInviteArgs
): Promise<SendInviteResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (!apiKey) {
    console.warn(
      '[sendInviteEmail] RESEND_API_KEY missing — skipping email send'
    );
    return { sent: false };
  }

  const acceptUrl = buildAcceptUrl(appUrl, args.token);
  const subject = `${args.inviterName} invited you to ${args.orgName} on OneSign – Lynx`;
  const html = renderInviteEmail({
    orgName: args.orgName,
    inviterName: args.inviterName,
    acceptUrl,
  });

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'OneSign – Lynx <noreply@onesignanddigital.com>',
        to: args.to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      console.error(
        `[sendInviteEmail] Resend non-ok status ${res.status} ${await res.text().catch(() => '')}`
      );
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error('[sendInviteEmail] fetch failed', err);
    return { sent: false };
  }
}

function renderInviteEmail(args: {
  orgName: string;
  inviterName: string;
  acceptUrl: string;
}): string {
  return `<!doctype html>
<html><body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
<h1 style="font-size: 20px; margin: 0 0 16px;">You're invited</h1>
<p style="margin: 0 0 16px;"><strong>${escapeHtml(args.inviterName)}</strong> invited you to join <strong>${escapeHtml(args.orgName)}</strong> on OneSign – Lynx.</p>
<p style="margin: 0 0 24px;">Click the button below to accept. The link expires in 7 days.</p>
<p style="margin: 0 0 24px;">
  <a href="${escapeAttr(args.acceptUrl)}" style="display: inline-block; background: #111; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none;">Accept invite</a>
</p>
<p style="margin: 0 0 8px; font-size: 13px; color: #666;">If the button doesn't work, paste this URL into your browser:</p>
<p style="margin: 0; word-break: break-all; font-size: 13px; color: #666;">${escapeHtml(args.acceptUrl)}</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
