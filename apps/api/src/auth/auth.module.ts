import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { MfaController } from './mfa.controller';
import { AuthService } from './auth.service';
import { CognitoProvider } from './cognito.provider';
import { CognitoGroupManager } from './cognito-group.manager';
import { CognitoTokenVerifier } from './cognito-token.verifier';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AuthController, MfaController],
  providers: [
    AuthService,
    CognitoProvider,
    CognitoGroupManager,
    CognitoTokenVerifier,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [CognitoGroupManager, JwtAuthGuard, RolesGuard, PassportModule],
})
export class AuthModule {}
