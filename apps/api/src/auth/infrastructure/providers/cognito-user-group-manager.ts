import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminListGroupsForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoGroup } from '@repo/shared-types';
import { UserGroupManager } from '../../domain/interfaces/user-group-manager.abstract';

@Injectable()
export class CognitoUserGroupManager extends UserGroupManager {
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.userPoolId = this.config.getOrThrow<string>('COGNITO_USER_POOL_ID');
    this.client = new CognitoIdentityProviderClient({
      region: this.config.getOrThrow<string>('COGNITO_REGION'),
    });
  }

  async addUserToGroup(username: string, group: CognitoGroup): Promise<void> {
    await this.client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: this.userPoolId,
        Username: username,
        GroupName: group,
      }),
    );
  }

  async removeUserFromGroup(username: string, group: CognitoGroup): Promise<void> {
    await this.client.send(
      new AdminRemoveUserFromGroupCommand({
        UserPoolId: this.userPoolId,
        Username: username,
        GroupName: group,
      }),
    );
  }

  async listUserGroups(username: string): Promise<CognitoGroup[]> {
    const response = await this.client.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      }),
    );

    return (response.Groups ?? []).map((g) => g.GroupName as CognitoGroup);
  }
}
