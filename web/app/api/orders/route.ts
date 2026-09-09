import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function apiBase(): string {
  const raw = process.env.API_URL ?? 'http://localhost:3001';
  return raw.startsWith('http') ? raw : `https://${raw}`;
}

export async function GET() {
  try {
    const res = await fetch(`${apiBase()}/orders`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'API unreachable', detail: String(err) },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    const res = await fetch(`${apiBase()}/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'API unreachable', detail: String(err) },
      { status: 502 },
    );
  }
}
