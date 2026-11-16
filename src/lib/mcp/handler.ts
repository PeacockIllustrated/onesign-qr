import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { verifyApiKey, extractBearerKey } from '@/lib/api-keys';
import { createLynxMcpServer } from './server';

function unauthorized(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Invalid or missing Lynx API key. Create one in Lynx → Settings → Claude.' },
      id: null,
    }),
    {
      status: 401,
      headers: {
        'content-type': 'application/json',
        'www-authenticate': 'Bearer realm="lynx-mcp"',
      },
    }
  );
}

/**
 * Handle one MCP Streamable HTTP request. Stateless: a fresh server and
 * transport per request, JSON responses (no SSE), which suits serverless.
 *
 * The key comes from `Authorization: Bearer …` or, for clients that can only
 * take a URL (claude.ai custom connectors), from the `/api/mcp/<key>` path.
 */
export async function handleMcpRequest(request: Request, pathKey?: string): Promise<Response> {
  const key = extractBearerKey(request.headers.get('authorization')) ?? pathKey ?? null;
  const ctx = await verifyApiKey(key);
  if (!ctx) return unauthorized();

  const server = createLynxMcpServer(ctx, {
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    userAgent: request.headers.get('user-agent'),
  });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } catch (error) {
    console.error('[mcp] request failed:', error instanceof Error ? error.message : 'unknown error');
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
