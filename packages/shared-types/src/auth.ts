export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT',
}

export const COGNITO_GROUPS = {
  ADMIN: 'Admins',
  CLIENT: 'Clients',
} as const;

export type CognitoGroup = (typeof COGNITO_GROUPS)[keyof typeof COGNITO_GROUPS];

export interface CognitoJwtPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  'cognito:username': string;
  'cognito:groups'?: CognitoGroup[];
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  auth_time: number;
  token_use: 'id' | 'access';
}

export interface AuthenticatedUser {
  sub: string;
  email: string;
  username: string;
  role: UserRole;
  groups: CognitoGroup[];
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface MfaSetupResult {
  secretCode: string;
  qrCodeUrl: string;
  session?: string;
}
