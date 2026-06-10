import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { AuthenticatedUser, COGNITO_GROUPS, CognitoGroup, UserRole } from '@repo/shared-types';
import { CognitoGroupManager } from '../auth/cognito-group.manager';

@Injectable()
export class CognitoUserRepository {
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly groupManager: CognitoGroupManager,
  ) {
    this.userPoolId = this.config.getOrThrow<string>('COGNITO_USER_POOL_ID');
    this.client = new CognitoIdentityProviderClient({
      region: this.config.getOrThrow<string>('COGNITO_REGION'),
    });
  }

  async findAll(): Promise<AuthenticatedUser[]> {
    const response = await this.client.send(
      new ListUsersCommand({ UserPoolId: this.userPoolId }),
    );

    return Promise.all(
      (response.Users ?? []).map(async (u) => {
        const attrs = u.Attributes ?? [];
        const get = (name: string) => attrs.find((a) => a.Name === name)?.Value ?? '';
        const username = u.Username ?? '';
        const groups = await this.groupManager.listUserGroups(username);
        const role = groups.includes(COGNITO_GROUPS.ADMIN) ? UserRole.ADMIN : UserRole.CLIENT;
        return { sub: get('sub'), email: get('email'), username, role, groups };
      }),
    );
  }

  async assignGroup(username: string, group: CognitoGroup): Promise<void> {
    const currentGroups = await this.groupManager.listUserGroups(username);
    const toRemove = currentGroups.filter((g) => g !== group);
    await Promise.all(toRemove.map((g) => this.groupManager.removeUserFromGroup(username, g)));
    await this.groupManager.addUserToGroup(username, group);
  }
}
