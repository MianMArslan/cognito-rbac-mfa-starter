import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (authHeader) {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: authHeader },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
