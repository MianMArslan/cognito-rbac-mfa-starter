import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ConfirmSignUpDto } from './dto/confirm-signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  async register(@Body() dto: RegisterDto) {
    await this.auth.register(dto.email, dto.password);
    return {
      success: true,
      message: 'Account created. Please check your email for a verification code.',
    };
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm account with emailed verification code' })
  async confirm(@Body() dto: ConfirmSignUpDto) {
    await this.auth.confirmEmail(dto.email, dto.code);
    return { success: true, message: 'Account confirmed. You can now sign in.' };
  }

  @Post('resend-confirmation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification code' })
  async resendConfirmation(@Body() dto: ForgotPasswordDto) {
    await this.auth.resendConfirmation(dto.email);
    return { success: true };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  async login(@Body() dto: LoginDto) {
    const result = await this.auth.login(dto.email, dto.password);

    if (result.mfaRequired) {
      return { success: true, mfaRequired: true, session: result.session };
    }

    return { success: true, ...result.tokens };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const tokens = await this.auth.refreshToken(dto.refreshToken, dto.username);
    return { success: true, ...tokens };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out and revoke tokens' })
  async logout(@Request() req: { headers: { authorization?: string } }) {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) await this.auth.logout(token);
    return { success: true, message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { success: true, message: 'If that email is registered, a reset link has been sent.' };
  }
}
