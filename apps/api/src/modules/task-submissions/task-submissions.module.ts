import { Module } from '@nestjs/common';
import { TaskSubmissionsController, SubmissionsGradingController } from './task-submissions.controller';
import { TaskSubmissionsService } from './task-submissions.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [TaskSubmissionsController, SubmissionsGradingController],
  providers: [TaskSubmissionsService],
  exports: [TaskSubmissionsService],
})
export class TaskSubmissionsModule {}
