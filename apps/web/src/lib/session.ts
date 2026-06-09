import { decodeJwt } from 'jose';
import type { AuthenticatedUser, UserRole, CognitoJwtPayload } from '@repo/shared-types';
import { COGNITO_GROUPS } from '@repo/shared-types';

const KEYS = {
  idToken: 'id_token',
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
} as const;

export interface SessionTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

export function saveSession(tokens: SessionTokens): void {
  sessionStorage.setItem(KEYS.idToken, tokens.idToken);
  sessionStorage.setItem(KEYS.accessToken, tokens.accessToken);
  sessionStorage.setItem(KEYS.refreshToken, tokens.refreshToken);
}

export function clearSession(): void {
  sessionStorage.removeItem(KEYS.idToken);
  sessionStorage.removeItem(KEYS.accessToken);
  sessionStorage.removeItem(KEYS.refreshToken);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(KEYS.accessToken);
}

export function getIdToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(KEYS.idToken);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(KEYS.refreshToken);
}

export function getSessionUser(): AuthenticatedUser | null {
  if (typeof window === 'undefined') return null;
  const idToken = sessionStorage.getItem(KEYS.idToken);
  if (!idToken) return null;

  try {
    const payload = decodeJwt(idToken) as unknown as CognitoJwtPayload;
    const groups = payload['cognito:groups'] ?? [];
    const role = (groups.includes(COGNITO_GROUPS.ADMIN) ? 'ADMIN' : 'CLIENT') as UserRole;

    return {
      sub: payload.sub,
      email: payload.email,
      username: payload['cognito:username'],
      role,
      groups,
    };
  } catch {
    return null;
  }
}
