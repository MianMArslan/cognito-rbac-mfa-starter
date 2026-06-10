import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CognitoProvider } from './cognito.provider';
import { CognitoGroupManager } from './cognito-group.manager';
import { AuthTokens, MfaSetupResult, COGNITO_GROUPS } from '@repo/shared-types';

export interface LoginResult {
  tokens?: AuthTokens;
  mfaRequired?: boolean;
  session?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly cognito: CognitoProvider,
    private readonly groupManager: CognitoGroupManager,
  ) {}

  async register(email: string, password: string): Promise<void> {
    try {
      await this.cognito.signUp(email, password);
      await this.groupManager.addUserToGroup(email, COGNITO_GROUPS.CLIENT);
    } catch (error: any) {
      if (error.name === 'UsernameExistsException') {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }

  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const result = await this.cognito.signIn(email, password);
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

  async confirmEmail(email: string, code: string): Promise<void> {
    await this.cognito.confirmSignUp(email, code);
  }

  async resendConfirmation(email: string): Promise<void> {
    await this.cognito.resendConfirmationCode(email);
  }

  async refreshToken(refreshToken: string, username: string): Promise<AuthTokens> {
    return this.cognito.refreshTokens(refreshToken, username);
  }

  async logout(accessToken: string): Promise<void> {
    await this.cognito.signOut(accessToken);
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await this.cognito.forgotPassword(email);
    } catch {
      // Never reveal whether an email is registered
    }
  }

  async setupMfa(accessToken: string): Promise<MfaSetupResult> {
    return this.cognito.associateSoftwareToken(accessToken);
  }

  async verifyMfaSetup(accessToken: string, code: string): Promise<void> {
    try {
      await this.cognito.verifySoftwareToken(accessToken, code);
    } catch (error: any) {
      if (error.name === 'EnableSoftwareTokenMFAException') {
        throw new UnauthorizedException('Invalid MFA code');
      }
      throw error;
    }
  }

  async verifyMfaChallenge(session: string, username: string, code: string): Promise<AuthTokens> {
    try {
      return await this.cognito.respondToMfaChallenge(session, username, code);
    } catch (error: any) {
      if (error.name === 'CodeMismatchException') {
        throw new UnauthorizedException('Invalid MFA code');
      }
      throw error;
    }
  }

  async disableMfa(accessToken: string): Promise<void> {
    await this.cognito.disableMfa(accessToken);
  }
}
