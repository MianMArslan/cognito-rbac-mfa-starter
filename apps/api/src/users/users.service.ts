import { Injectable } from '@nestjs/common';
import { CognitoUserRepository } from './cognito-user.repository';
import { AuthenticatedUser, CognitoGroup } from '@repo/shared-types';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: CognitoUserRepository) {}

  async findAll(): Promise<AuthenticatedUser[]> {
    return this.userRepository.findAll();
  }

  async assignGroup(username: string, group: CognitoGroup): Promise<void> {
    await this.userRepository.assignGroup(username, group);
  }
}
