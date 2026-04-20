import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendInviteEmail, buildAcceptUrl } from '@/lib/email/send-invite';

describe('buildAcceptUrl', () => {
  it('combines NEXT_PUBLIC_APP_URL and token', () => {
    expect(buildAcceptUrl('https://app.example.com', 'tok-123')).toBe(
      'https://app.example.com/invite/tok-123'
    );
  });

  it('strips trailing slash from base', () => {
    expect(buildAcceptUrl('https://app.example.com/', 'tok-abc')).toBe(
      'https://app.example.com/invite/tok-abc'
    );
  });
});

describe('sendInviteEmail', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('does not send when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendInviteEmail({
      to: 'sarah@example.com',
      orgName: 'Johns Cafe',
      inviterName: 'John',
      token: 'tok-abc',
    });

    expect(result.sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs to Resend with an authorization header and expected body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'eml-1' }), { status: 200 })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendInviteEmail({
      to: 'sarah@example.com',
      orgName: 'Johns Cafe',
      inviterName: 'John',
      token: 'tok-abc',
    });

    expect(result.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(
      (init.headers as Record<string, string>).Authorization
    ).toBe('Bearer test-key');

    const body = JSON.parse(init.body as string);
    expect(body.to).toBe('sarah@example.com');
    expect(body.subject).toContain('Johns Cafe');
    const html = body.html as string;
    expect(html).toContain('https://app.example.com/invite/tok-abc');
    expect(html).toContain('John');
    expect(html).toContain('Johns Cafe');
  });

  it('returns sent=false when Resend responds with an error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('boom', { status: 500 })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendInviteEmail({
      to: 'sarah@example.com',
      orgName: 'Johns Cafe',
      inviterName: 'John',
      token: 'tok-abc',
    });

    expect(result.sent).toBe(false);
  });
});
