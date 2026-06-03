import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { AuthenticatedUser, COGNITO_GROUPS, CognitoGroup, UserRole } from '@repo/shared-types';
import { UserRepository } from '../../domain/interfaces/user-repository.abstract';
import { UserGroupManager } from '../../../auth/domain/interfaces/user-group-manager.abstract';

@Injectable()
export class CognitoUserRepository extends UserRepository {
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly groupManager: UserGroupManager,
  ) {
    super();
    this.userPoolId = this.config.getOrThrow<string>('COGNITO_USER_POOL_ID');
    this.client = new CognitoIdentityProviderClient({
      region: this.config.getOrThrow<string>('COGNITO_REGION'),
    });
  }

  async findAll(): Promise<AuthenticatedUser[]> {
    const response = await this.client.send(
      new ListUsersCommand({ UserPoolId: this.userPoolId }),
    );

    const users = await Promise.all(
      (response.Users ?? []).map(async (u) => {
        const attrs = u.Attributes ?? [];
        const get = (name: string) => attrs.find((a) => a.Name === name)?.Value ?? '';
        const username = u.Username ?? '';
        const groups = await this.groupManager.listUserGroups(username);
        const role = groups.includes(COGNITO_GROUPS.ADMIN) ? UserRole.ADMIN : UserRole.CLIENT;
        return { sub: get('sub'), email: get('email'), username, role, groups };
      }),
    );

    return users;
  }

  async assignGroup(username: string, group: CognitoGroup): Promise<void> {
    const currentGroups = await this.groupManager.listUserGroups(username);
    const toRemove = currentGroups.filter((g) => g !== group);
    await Promise.all(toRemove.map((g) => this.groupManager.removeUserFromGroup(username, g)));
    await this.groupManager.addUserToGroup(username, group);
  }
}
