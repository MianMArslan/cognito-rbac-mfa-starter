import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const COOKIE_OPTS = [
  'HttpOnly',
  'SameSite=Lax',
  'Path=/',
  ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
].join('; ');

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  if (data.mfaRequired) {
    return NextResponse.json({ mfaRequired: true, session: data.session });
  }

  const response = NextResponse.json({ success: true });

  response.headers.append('Set-Cookie', `id_token=${data.idToken}; Max-Age=3600; ${COOKIE_OPTS}`);
  response.headers.append('Set-Cookie', `access_token=${data.accessToken}; Max-Age=3600; ${COOKIE_OPTS}`);
  response.headers.append('Set-Cookie', `refresh_token=${data.refreshToken}; Max-Age=2592000; ${COOKIE_OPTS}`);

  return response;
}
