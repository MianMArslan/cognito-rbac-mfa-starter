import { Injectable, ConflictException } from '@nestjs/common';
import { CognitoAuthProvider } from '../../domain/interfaces/cognito-auth-provider.abstract';
import { UserGroupManager } from '../../domain/interfaces/user-group-manager.abstract';
import { COGNITO_GROUPS } from '@repo/shared-types';

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly authProvider: CognitoAuthProvider,
    private readonly groupManager: UserGroupManager,
  ) {}

  async execute(email: string, password: string): Promise<void> {
    try {
      await this.authProvider.signUp(email, password);
      await this.groupManager.addUserToGroup(email, COGNITO_GROUPS.CLIENT);
    } catch (error: any) {
      if (error.name === 'UsernameExistsException') {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }
}
