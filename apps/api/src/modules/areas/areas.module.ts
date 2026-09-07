import { Module } from '@nestjs/common';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AreasController],
  providers: [AreasService],
  exports: [AreasService],
})
export class AreasModule {}