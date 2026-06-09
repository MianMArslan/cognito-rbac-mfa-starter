import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  const res = await fetch(`${API_URL}/api/v1/auth/mfa/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
