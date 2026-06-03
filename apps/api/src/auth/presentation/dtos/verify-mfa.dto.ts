import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMfaSetupDto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code from authenticator app' })
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class VerifyMfaChallengeDto {
  @ApiProperty({ example: 'AYABe...', description: 'Session from login response' })
  @IsString()
  session!: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  username!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
