import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CognitoJwtStrategy } from './infrastructure/strategies/cognito-jwt.strategy';
import { CognitoAuthProviderImpl } from './infrastructure/providers/cognito-auth.provider';
import { CognitoTokenVerifier } from './infrastructure/providers/cognito-token-verifier';
import { CognitoUserGroupManager } from './infrastructure/providers/cognito-user-group-manager';
import { AuthController } from './presentation/controllers/auth.controller';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { SetupMfaUseCase } from './application/use-cases/setup-mfa.use-case';
import { VerifyMfaUseCase } from './application/use-cases/verify-mfa.use-case';
import { CognitoAuthProvider } from './domain/interfaces/cognito-auth-provider.abstract';
import { TokenVerifier } from './domain/interfaces/token-verifier.abstract';
import { UserGroupManager } from './domain/interfaces/user-group-manager.abstract';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AuthController],
  providers: [
    CognitoJwtStrategy,
    RegisterUseCase,
    LoginUseCase,
    SetupMfaUseCase,
    VerifyMfaUseCase,
    // Dependency Inversion: bind abstractions to concrete implementations
    { provide: CognitoAuthProvider, useClass: CognitoAuthProviderImpl },
    { provide: TokenVerifier, useClass: CognitoTokenVerifier },
    { provide: UserGroupManager, useClass: CognitoUserGroupManager },
  ],
  exports: [CognitoAuthProvider, TokenVerifier, UserGroupManager, PassportModule],
})
export class AuthModule {}
