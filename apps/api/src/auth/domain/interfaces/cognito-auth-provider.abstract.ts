import { AuthTokens, MfaSetupResult } from '@repo/shared-types';

export abstract class CognitoAuthProvider {
  abstract signUp(email: string, password: string): Promise<void>;
  abstract signIn(email: string, password: string): Promise<AuthTokens | { session: string; challengeName: string }>;
  abstract refreshTokens(refreshToken: string, username: string): Promise<AuthTokens>;
  abstract signOut(accessToken: string): Promise<void>;
  abstract associateSoftwareToken(accessToken: string): Promise<MfaSetupResult>;
  abstract verifySoftwareToken(accessToken: string, code: string): Promise<void>;
  abstract respondToMfaChallenge(session: string, username: string, code: string): Promise<AuthTokens>;
  abstract disableMfa(accessToken: string): Promise<void>;
  abstract getUser(accessToken: string): Promise<{ sub: string; email: string; username: string }>;
  abstract resendConfirmationCode(email: string): Promise<void>;
  abstract confirmSignUp(email: string, code: string): Promise<void>;
  abstract forgotPassword(email: string): Promise<void>;
}
