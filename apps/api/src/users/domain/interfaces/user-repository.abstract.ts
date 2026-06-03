import { AuthenticatedUser, CognitoGroup } from '@repo/shared-types';

export abstract class UserRepository {
  abstract findAll(): Promise<AuthenticatedUser[]>;
  abstract assignGroup(username: string, group: CognitoGroup): Promise<void>;
}
