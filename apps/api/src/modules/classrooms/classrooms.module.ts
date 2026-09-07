import { Module } from '@nestjs/common';
import { ClassroomsController } from './classrooms.controller';
import { ClassroomsService } from './classrooms.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ClassroomsController],
  providers: [ClassroomsService],
  exports: [ClassroomsService],
})
export class ClassroomsModule {}
