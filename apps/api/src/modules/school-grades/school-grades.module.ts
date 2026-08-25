import { Module } from '@nestjs/common';
import { SchoolGradesController } from './school-grades.controller';
import { SchoolGradesService } from './school-grades.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [SchoolGradesController],
  providers: [SchoolGradesService],
  exports: [SchoolGradesService],
})
export class SchoolGradesModule {}
