import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CognitoAuthProvider } from '../../domain/interfaces/cognito-auth-provider.abstract';
import { AuthTokens } from '@repo/shared-types';

@Injectable()
export class VerifyMfaUseCase {
  constructor(private readonly authProvider: CognitoAuthProvider) {}

  async setupVerify(accessToken: string, code: string): Promise<void> {
    try {
      await this.authProvider.verifySoftwareToken(accessToken, code);
    } catch (error: any) {
      if (error.name === 'EnableSoftwareTokenMFAException') {
        throw new UnauthorizedException('Invalid MFA code');
      }
      throw error;
    }
  }

  async challengeVerify(
    session: string,
    username: string,
    code: string,
  ): Promise<AuthTokens> {
    try {
      return await this.authProvider.respondToMfaChallenge(session, username, code);
    } catch (error: any) {
      if (error.name === 'CodeMismatchException') {
        throw new UnauthorizedException('Invalid MFA code');
      }
      throw error;
    }
  }
}
