import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { CognitoAuthProvider } from '../../domain/interfaces/cognito-auth-provider.abstract';
import { AuthTokens } from '@repo/shared-types';

export interface LoginResult {
  tokens?: AuthTokens;
  mfaRequired?: boolean;
  session?: string;
}

@Injectable()
export class LoginUseCase {
  constructor(private readonly authProvider: CognitoAuthProvider) {}

  async execute(email: string, password: string): Promise<LoginResult> {
    try {
      const result = await this.authProvider.signIn(email, password);

      if ('challengeName' in result) {
        return { mfaRequired: true, session: result.session };
      }

      return { tokens: result };
    } catch (error: any) {
      if (error.name === 'NotAuthorizedException' || error.name === 'UserNotFoundException') {
        throw new UnauthorizedException('Invalid email or password');
      }
      if (error.name === 'UserNotConfirmedException') {
        throw new HttpException(
          { message: 'Email not verified', errorCode: 'EMAIL_NOT_CONFIRMED' },
          HttpStatus.FORBIDDEN,
        );
      }
      throw error;
    }
  }
}
