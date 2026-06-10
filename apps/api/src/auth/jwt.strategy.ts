import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser, COGNITO_GROUPS, CognitoJwtPayload, UserRole } from '@repo/shared-types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const region = config.getOrThrow<string>('COGNITO_REGION');
    const userPoolId = config.getOrThrow<string>('COGNITO_USER_POOL_ID');
    const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: config.getOrThrow<string>('COGNITO_CLIENT_ID'),
      issuer,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/.well-known/jwks.json`,
      }),
    });
  }

  validate(payload: CognitoJwtPayload): AuthenticatedUser {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const groups = payload['cognito:groups'] ?? [];
    const role = groups.includes(COGNITO_GROUPS.ADMIN) ? UserRole.ADMIN : UserRole.CLIENT;

    return {
      sub: payload.sub,
      email: payload.email,
      username: payload['cognito:username'],
      role,
      groups,
    };
  }
}
