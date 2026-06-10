import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { COGNITO_GROUPS, CognitoGroup } from '@repo/shared-types';

export class AssignRoleDto {
  @ApiProperty({ enum: COGNITO_GROUPS, example: COGNITO_GROUPS.ADMIN })
  @IsEnum(COGNITO_GROUPS)
  group!: CognitoGroup;
}
