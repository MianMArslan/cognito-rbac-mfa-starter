import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  GlobalSignOutCommand,
  AssociateSoftwareTokenCommand,
  VerifySoftwareTokenCommand,
  RespondToAuthChallengeCommand,
  SetUserMFAPreferenceCommand,
  GetUserCommand,
  ForgotPasswordCommand,
  AuthFlowType,
  ChallengeNameType,
} from '@aws-sdk/client-cognito-identity-provider';
import { AuthTokens, MfaSetupResult } from '@repo/shared-types';
import { CognitoAuthProvider } from '../../domain/interfaces/cognito-auth-provider.abstract';
import * as crypto from 'crypto';

@Injectable()
export class CognitoAuthProviderImpl extends CognitoAuthProvider {
  private readonly client: CognitoIdentityProviderClient;
  private readonly clientId: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.clientId = this.config.getOrThrow<string>('COGNITO_CLIENT_ID');
    this.client = new CognitoIdentityProviderClient({
      region: this.config.getOrThrow<string>('COGNITO_REGION'),
    });
  }

  async signUp(email: string, password: string): Promise<void> {
    await this.client.send(
      new SignUpCommand({
        ClientId: this.clientId,
        Username: email,
        Password: password,
        UserAttributes: [{ Name: 'email', Value: email }],
      }),
    );
  }

  async signIn(
    email: string,
    password: string,
  ): Promise<AuthTokens | { session: string; challengeName: string }> {
    const response = await this.client.send(
      new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      }),
    );

    if (response.ChallengeName === ChallengeNameType.SOFTWARE_TOKEN_MFA) {
      return {
        session: response.Session!,
        challengeName: response.ChallengeName,
      };
    }

    if (!response.AuthenticationResult) {
      throw new UnauthorizedException('Authentication failed');
    }

    return this.mapAuthResult(response.AuthenticationResult);
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const response = await this.client.send(
      new InitiateAuthCommand({
        AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
        ClientId: this.clientId,
        AuthParameters: { REFRESH_TOKEN: refreshToken },
      }),
    );

    if (!response.AuthenticationResult) {
      throw new UnauthorizedException('Token refresh failed');
    }

    return {
      ...this.mapAuthResult(response.AuthenticationResult),
      refreshToken,
    };
  }

  async signOut(accessToken: string): Promise<void> {
    await this.client.send(new GlobalSignOutCommand({ AccessToken: accessToken }));
  }

  async associateSoftwareToken(accessToken: string): Promise<MfaSetupResult> {
    const response = await this.client.send(
      new AssociateSoftwareTokenCommand({ AccessToken: accessToken }),
    );

    if (!response.SecretCode) {
      throw new BadRequestException('Failed to generate MFA secret');
    }

    const user = await this.getUser(accessToken);
    const issuer = encodeURIComponent('CognitoRbacMfaStarter');
    const account = encodeURIComponent(user.email);
    const qrCodeUrl = `otpauth://totp/${issuer}:${account}?secret=${response.SecretCode}&issuer=${issuer}`;

    return {
      secretCode: response.SecretCode,
      qrCodeUrl,
      session: response.Session,
    };
  }

  async verifySoftwareToken(accessToken: string, code: string): Promise<void> {
    await this.client.send(
      new VerifySoftwareTokenCommand({
        AccessToken: accessToken,
        UserCode: code,
      }),
    );

    await this.client.send(
      new SetUserMFAPreferenceCommand({
        AccessToken: accessToken,
        SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true },
      }),
    );
  }

  async respondToMfaChallenge(
    session: string,
    username: string,
    code: string,
  ): Promise<AuthTokens> {
    const response = await this.client.send(
      new RespondToAuthChallengeCommand({
        ClientId: this.clientId,
        ChallengeName: ChallengeNameType.SOFTWARE_TOKEN_MFA,
        Session: session,
        ChallengeResponses: {
          USERNAME: username,
          SOFTWARE_TOKEN_MFA_CODE: code,
        },
      }),
    );

    if (!response.AuthenticationResult) {
      throw new UnauthorizedException('MFA verification failed');
    }

    return this.mapAuthResult(response.AuthenticationResult);
  }

  async disableMfa(accessToken: string): Promise<void> {
    await this.client.send(
      new SetUserMFAPreferenceCommand({
        AccessToken: accessToken,
        SoftwareTokenMfaSettings: { Enabled: false, PreferredMfa: false },
      }),
    );
  }

  async forgotPassword(email: string): Promise<void> {
    await this.client.send(
      new ForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email,
      }),
    );
  }

  async getUser(
    accessToken: string,
  ): Promise<{ sub: string; email: string; username: string }> {
    const response = await this.client.send(
      new GetUserCommand({ AccessToken: accessToken }),
    );

    const attrs = response.UserAttributes ?? [];
    const get = (name: string) => attrs.find((a) => a.Name === name)?.Value ?? '';

    return {
      sub: get('sub'),
      email: get('email'),
      username: response.Username ?? '',
    };
  }

  private mapAuthResult(result: {
    AccessToken?: string;
    IdToken?: string;
    RefreshToken?: string;
    ExpiresIn?: number;
  }): AuthTokens {
    return {
      accessToken: result.AccessToken!,
      idToken: result.IdToken!,
      refreshToken: result.RefreshToken!,
      expiresIn: result.ExpiresIn ?? 3600,
    };
  }
}
