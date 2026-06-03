import { CognitoGroup } from '@repo/shared-types';

export abstract class UserGroupManager {
  abstract addUserToGroup(username: string, group: CognitoGroup): Promise<void>;
  abstract removeUserFromGroup(username: string, group: CognitoGroup): Promise<void>;
  abstract listUserGroups(username: string): Promise<CognitoGroup[]>;
}
