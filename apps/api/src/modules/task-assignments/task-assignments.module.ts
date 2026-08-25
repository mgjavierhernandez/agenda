import { Module } from '@nestjs/common';
import { TaskAssignmentsController } from './task-assignments.controller';
import { TaskAssignmentsService } from './task-assignments.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [TaskAssignmentsController],
  providers: [TaskAssignmentsService],
  exports: [TaskAssignmentsService],
})
export class TaskAssignmentsModule {}
