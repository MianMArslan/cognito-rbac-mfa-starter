import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { CognitoJwtPayload, AuthenticatedUser, UserRole } from '@repo/shared-types';
import { COGNITO_GROUPS } from '@repo/shared-types';
import { cookies } from 'next/headers';

const COGNITO_JWKS_URL = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

const JWKS = createRemoteJWKSet(new URL(COGNITO_JWKS_URL));

export async function verifyToken(token: string): Promise<CognitoJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      audience: process.env.COGNITO_CLIENT_ID,
    });
    return payload as unknown as CognitoJwtPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const idToken = cookieStore.get('id_token')?.value;

  if (!idToken) return null;

  const payload = await verifyToken(idToken);
  if (!payload) return null;

  const groups = payload['cognito:groups'] ?? [];
  const role: UserRole = groups.includes(COGNITO_GROUPS.ADMIN)
    ? ('ADMIN' as UserRole)
    : ('CLIENT' as UserRole);

  return {
    sub: payload.sub,
    email: payload.email,
    username: payload['cognito:username'],
    role,
    groups,
  };
}

export function setTokenCookies(
  response: Response,
  tokens: { idToken: string; accessToken: string; refreshToken: string },
) {
  const cookieOpts = [
    `HttpOnly`,
    `SameSite=Lax`,
    `Path=/`,
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

  response.headers.append('Set-Cookie', `id_token=${tokens.idToken}; Max-Age=3600; ${cookieOpts}`);
  response.headers.append(
    'Set-Cookie',
    `access_token=${tokens.accessToken}; Max-Age=3600; ${cookieOpts}`,
  );
  response.headers.append(
    'Set-Cookie',
    `refresh_token=${tokens.refreshToken}; Max-Age=2592000; ${cookieOpts}`,
  );
}
