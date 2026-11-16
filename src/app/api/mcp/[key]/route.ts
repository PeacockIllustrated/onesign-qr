import { handleMcpRequest } from '@/lib/mcp/handler';

/**
 * Lynx MCP endpoint with the API key in the URL path, for clients that can
 * only be given a URL (e.g. claude.ai custom connectors). Treat the full URL
 * as a secret.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Ctx = { params: Promise<{ key: string }> };

export async function POST(request: Request, { params }: Ctx) {
  return handleMcpRequest(request, (await params).key);
}

export async function GET(request: Request, { params }: Ctx) {
  return handleMcpRequest(request, (await params).key);
}

export async function DELETE(request: Request, { params }: Ctx) {
  return handleMcpRequest(request, (await params).key);
}
