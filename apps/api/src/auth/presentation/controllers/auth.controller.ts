import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { SetupMfaUseCase } from '../../application/use-cases/setup-mfa.use-case';
import { VerifyMfaUseCase } from '../../application/use-cases/verify-mfa.use-case';
import { CognitoAuthProvider } from '../../domain/interfaces/cognito-auth-provider.abstract';
import { JwtAuthGuard } from '../../infrastructure/guards/jwt-auth.guard';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { VerifyMfaChallengeDto, VerifyMfaSetupDto } from '../dtos/verify-mfa.dto';
import { AuthenticatedUser } from '@repo/shared-types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly register: RegisterUseCase,
    private readonly login: LoginUseCase,
    private readonly setupMfa: SetupMfaUseCase,
    private readonly verifyMfa: VerifyMfaUseCase,
    private readonly authProvider: CognitoAuthProvider,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  async registerUser(@Body() dto: RegisterDto) {
    await this.register.execute(dto.email, dto.password);
    return { success: true, message: 'Account created. Please check your email to verify.' };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  async loginUser(@Body() dto: LoginDto) {
    const result = await this.login.execute(dto.email, dto.password);

    if (result.mfaRequired) {
      return { success: true, mfaRequired: true, session: result.session };
    }

    return { success: true, ...result.tokens };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const tokens = await this.authProvider.refreshTokens(dto.refreshToken);
    return { success: true, ...tokens };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out and revoke tokens' })
  async logout(@Request() req: { headers: { authorization?: string } }) {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await this.authProvider.signOut(token);
    }
    return { success: true, message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    try {
      await this.authProvider.forgotPassword(dto.email);
    } catch {
      // Always return success — never confirm whether an email is registered
    }
    return { success: true, message: 'If that email is registered, a reset link has been sent.' };
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Begin TOTP MFA setup — returns secret and QR code URL' })
  async mfaSetup(@Request() req: { headers: { authorization?: string } }) {
    const token = req.headers.authorization!.split(' ')[1];
    const result = await this.setupMfa.execute(token);
    return { success: true, data: result };
  }

  @Post('mfa/verify-setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm TOTP code to activate MFA on account' })
  async mfaVerifySetup(
    @Request() req: { headers: { authorization?: string } },
    @Body() dto: VerifyMfaSetupDto,
  ) {
    const token = req.headers.authorization!.split(' ')[1];
    await this.verifyMfa.setupVerify(token, dto.code);
    return { success: true, message: 'MFA enabled successfully' };
  }

  @Post('mfa/challenge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Respond to MFA challenge during login' })
  async mfaChallenge(@Body() dto: VerifyMfaChallengeDto) {
    const tokens = await this.verifyMfa.challengeVerify(dto.session, dto.username, dto.code);
    return { success: true, ...tokens };
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable MFA for the authenticated user' })
  async mfaDisable(@Request() req: { headers: { authorization?: string } }) {
    const token = req.headers.authorization!.split(' ')[1];
    await this.authProvider.disableMfa(token);
    return { success: true, message: 'MFA disabled' };
  }
}
