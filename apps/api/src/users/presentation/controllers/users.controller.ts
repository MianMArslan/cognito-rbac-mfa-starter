import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard';
import { Roles } from '../../../roles/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRepository } from '../../domain/interfaces/user-repository.abstract';
import { AssignRoleDto } from '../dtos/assign-role.dto';
import { AuthenticatedUser, UserRole } from '@repo/shared-types';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly userRepository: UserRepository) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: user };
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users (Admin only)' })
  async listUsers() {
    const users = await this.userRepository.findAll();
    return { success: true, data: users };
  }

  @Patch(':username/role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a user to a group/role (Admin only)' })
  async assignRole(@Param('username') username: string, @Body() dto: AssignRoleDto) {
    await this.userRepository.assignGroup(username, dto.group);
    return { success: true, message: `User ${username} assigned to ${dto.group}` };
  }
}
