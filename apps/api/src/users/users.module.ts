import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CognitoUserRepository } from './cognito-user.repository';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, CognitoUserRepository],
})
export class UsersModule {}
