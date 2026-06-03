import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const COOKIE_OPTS = [
  'HttpOnly',
  'SameSite=Lax',
  'Path=/',
  ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
].join('; ');

export async function POST(_request: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
  }

  const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  const response = NextResponse.json({ success: true });
  response.headers.append('Set-Cookie', `id_token=${data.idToken}; Max-Age=3600; ${COOKIE_OPTS}`);
  response.headers.append('Set-Cookie', `access_token=${data.accessToken}; Max-Age=3600; ${COOKIE_OPTS}`);

  return response;
}
