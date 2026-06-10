import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { CognitoJwtPayload } from '@repo/shared-types';

@Injectable()
export class CognitoTokenVerifier {
  private readonly verifier: ReturnType<typeof CognitoJwtVerifier.create>;

  constructor(private readonly config: ConfigService) {
    this.verifier = CognitoJwtVerifier.create({
      userPoolId: this.config.getOrThrow<string>('COGNITO_USER_POOL_ID'),
      tokenUse: 'id',
      clientId: this.config.getOrThrow<string>('COGNITO_CLIENT_ID'),
    });
  }

  async verify(token: string): Promise<CognitoJwtPayload> {
    try {
      const payload = await this.verifier.verify(token);
      return payload as unknown as CognitoJwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
