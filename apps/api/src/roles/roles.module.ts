import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/infrastructure/guards/roles.guard';

@Module({
  providers: [RolesGuard],
  exports: [RolesGuard],
})
export class RolesModule {}
