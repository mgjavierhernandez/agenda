import { Module } from '@nestjs/common';
import { ScheduleBlocksController } from './schedule-blocks.controller';
import { ScheduleBlocksService } from './schedule-blocks.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ScheduleBlocksController],
  providers: [ScheduleBlocksService],
  exports: [ScheduleBlocksService],
})
export class ScheduleBlocksModule {}
