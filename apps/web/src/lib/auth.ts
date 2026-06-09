import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { CognitoJwtPayload } from '@repo/shared-types';

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
