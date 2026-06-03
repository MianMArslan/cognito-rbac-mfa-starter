import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const CLEAR_COOKIE = 'Max-Age=0; HttpOnly; SameSite=Lax; Path=/';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (accessToken) {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
  }

  const response = NextResponse.json({ success: true });
  response.headers.append('Set-Cookie', `id_token=; ${CLEAR_COOKIE}`);
  response.headers.append('Set-Cookie', `access_token=; ${CLEAR_COOKIE}`);
  response.headers.append('Set-Cookie', `refresh_token=; ${CLEAR_COOKIE}`);

  return response;
}
