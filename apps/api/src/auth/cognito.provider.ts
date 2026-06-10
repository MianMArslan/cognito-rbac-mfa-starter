import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
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
import * as crypto from 'crypto';

@Injectable()
export class CognitoProvider {
  private readonly client: CognitoIdentityProviderClient;
  private readonly clientId: string;
  private readonly clientSecret: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.getOrThrow<string>('COGNITO_CLIENT_ID');
    this.clientSecret = this.config.get<string>('COGNITO_CLIENT_SECRET');
    this.client = new CognitoIdentityProviderClient({
      region: this.config.getOrThrow<string>('COGNITO_REGION'),
    });
  }

  private computeSecretHash(username: string): string | undefined {
    if (!this.clientSecret) return undefined;
    return crypto
      .createHmac('sha256', this.clientSecret)
      .update(username + this.clientId)
      .digest('base64');
  }

  async signUp(email: string, password: string): Promise<void> {
    await this.client.send(
      new SignUpCommand({
        ClientId: this.clientId,
        Username: email,
        Password: password,
        UserAttributes: [{ Name: 'email', Value: email }],
        SecretHash: this.computeSecretHash(email),
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
          ...(this.computeSecretHash(email) && { SECRET_HASH: this.computeSecretHash(email) }),
        },
      }),
    );

    if (response.ChallengeName === ChallengeNameType.SOFTWARE_TOKEN_MFA) {
      return { session: response.Session!, challengeName: response.ChallengeName };
    }

    if (!response.AuthenticationResult) {
      throw new UnauthorizedException('Authentication failed');
    }

    return this.mapAuthResult(response.AuthenticationResult);
  }

  async refreshTokens(refreshToken: string, username: string): Promise<AuthTokens> {
    const response = await this.client.send(
      new InitiateAuthCommand({
        AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
          ...(this.computeSecretHash(username) && { SECRET_HASH: this.computeSecretHash(username) }),
        },
      }),
    );

    if (!response.AuthenticationResult) {
      throw new UnauthorizedException('Token refresh failed');
    }

    return { ...this.mapAuthResult(response.AuthenticationResult), refreshToken };
  }

  async signOut(accessToken: string): Promise<void> {
    await this.client.send(new GlobalSignOutCommand({ AccessToken: accessToken }));
  }

  async confirmSignUp(email: string, code: string): Promise<void> {
    await this.client.send(
      new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
        SecretHash: this.computeSecretHash(email),
      }),
    );
  }

  async resendConfirmationCode(email: string): Promise<void> {
    await this.client.send(
      new ResendConfirmationCodeCommand({
        ClientId: this.clientId,
        Username: email,
        SecretHash: this.computeSecretHash(email),
      }),
    );
  }

  async forgotPassword(email: string): Promise<void> {
    await this.client.send(
      new ForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email,
        SecretHash: this.computeSecretHash(email),
      }),
    );
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

    return { secretCode: response.SecretCode, qrCodeUrl, session: response.Session };
  }

  async verifySoftwareToken(accessToken: string, code: string): Promise<void> {
    await this.client.send(
      new VerifySoftwareTokenCommand({ AccessToken: accessToken, UserCode: code }),
    );
    await this.client.send(
      new SetUserMFAPreferenceCommand({
        AccessToken: accessToken,
        SoftwareTokenMfaSettings: { Enabled: true, PreferredMfa: true },
      }),
    );
  }

  async respondToMfaChallenge(session: string, username: string, code: string): Promise<AuthTokens> {
    const response = await this.client.send(
      new RespondToAuthChallengeCommand({
        ClientId: this.clientId,
        ChallengeName: ChallengeNameType.SOFTWARE_TOKEN_MFA,
        Session: session,
        ChallengeResponses: {
          USERNAME: username,
          SOFTWARE_TOKEN_MFA_CODE: code,
          ...(this.computeSecretHash(username) && { SECRET_HASH: this.computeSecretHash(username) }),
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

  async getUser(accessToken: string): Promise<{ sub: string; email: string; username: string }> {
    const response = await this.client.send(
      new GetUserCommand({ AccessToken: accessToken }),
    );
    const attrs = response.UserAttributes ?? [];
    const get = (name: string) => attrs.find((a) => a.Name === name)?.Value ?? '';
    return { sub: get('sub'), email: get('email'), username: response.Username ?? '' };
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
