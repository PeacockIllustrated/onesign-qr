import { handleMcpRequest } from '@/lib/mcp/handler';

/**
 * Lynx MCP endpoint (Claude connector).
 * Auth: `Authorization: Bearer lynx_…`. Keys are created in /app/settings/claude.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request) {
  return handleMcpRequest(request);
}

export async function GET(request: Request) {
  return handleMcpRequest(request);
}

export async function DELETE(request: Request) {
  return handleMcpRequest(request);
}
