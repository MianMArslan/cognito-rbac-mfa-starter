import { Injectable } from '@nestjs/common';
import { CognitoAuthProvider } from '../../domain/interfaces/cognito-auth-provider.abstract';
import { MfaSetupResult } from '@repo/shared-types';

@Injectable()
export class SetupMfaUseCase {
  constructor(private readonly authProvider: CognitoAuthProvider) {}

  async execute(accessToken: string): Promise<MfaSetupResult> {
    return this.authProvider.associateSoftwareToken(accessToken);
  }
}
