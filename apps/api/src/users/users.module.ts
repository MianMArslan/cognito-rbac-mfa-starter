import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { UsersController } from './presentation/controllers/users.controller';
import { CognitoUserRepository } from './infrastructure/repositories/cognito-user-repository';
import { UserRepository } from './domain/interfaces/user-repository.abstract';

@Module({
  imports: [AuthModule, RolesModule],
  controllers: [UsersController],
  providers: [
    { provide: UserRepository, useClass: CognitoUserRepository },
  ],
})
export class UsersModule {}
