import { CognitoJwtPayload } from '@repo/shared-types';

export abstract class TokenVerifier {
  abstract verify(token: string): Promise<CognitoJwtPayload>;
}
