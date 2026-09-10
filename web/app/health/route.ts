import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Liveness endpoint for the Render/Railway `/health` check.
export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'web',
    ts: new Date().toISOString(),
  });
}
