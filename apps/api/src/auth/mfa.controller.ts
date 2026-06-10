import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { VerifyMfaChallengeDto, VerifyMfaSetupDto } from './dto/verify-mfa.dto';

@ApiTags('mfa')
@Controller('auth/mfa')
export class MfaController {
  constructor(private readonly auth: AuthService) {}

  // MFA endpoints extract the raw access token and pass it directly to the Cognito SDK.
  // Cognito validates the access token itself, so no JWT guard is needed here.
  // (The JwtAuthGuard is configured for ID tokens; Cognito MFA APIs require access tokens.)

  @Post('setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Begin TOTP MFA setup — returns secret and QR code URL' })
  async setup(@Request() req: { headers: { authorization?: string } }) {
    const token = this.extractToken(req);
    try {
      const result = await this.auth.setupMfa(token);
      return { success: true, data: result };
    } catch (e: any) {
      console.log('🚀 ~ MfaController ~ setup ~ e:', e);

      if (e.name === 'NotAuthorizedException' || e.name === 'InvalidParameterException') {
        throw new UnauthorizedException('Invalid or expired access token');
      }
      throw e;
    }
  }

  @Post('verify-setup')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm TOTP code to activate MFA on account' })
  async verifySetup(
    @Request() req: { headers: { authorization?: string } },
    @Body() dto: VerifyMfaSetupDto,
  ) {
    const token = this.extractToken(req);
    try {
      await this.auth.verifyMfaSetup(token, dto.code);
      return { success: true, message: 'MFA enabled successfully' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  @Post('challenge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Respond to MFA challenge during login' })
  async challenge(@Body() dto: VerifyMfaChallengeDto) {
    const tokens = await this.auth.verifyMfaChallenge(dto.session, dto.username, dto.code);
    return { success: true, ...tokens };
  }

  @Post('disable')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable MFA for the authenticated user' })
  async disable(@Request() req: { headers: { authorization?: string } }) {
    const token = this.extractToken(req);
    try {
      await this.auth.disableMfa(token);
      return { success: true, message: 'MFA disabled' };
    } catch (e: any) {
      if (e.name === 'NotAuthorizedException' || e.name === 'InvalidParameterException') {
        throw new UnauthorizedException('Invalid or expired access token');
      }
      throw e;
    }
  }

  private extractToken(req: { headers: { authorization?: string } }): string {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Missing access token');
    return auth.split(' ')[1];
  }
}
