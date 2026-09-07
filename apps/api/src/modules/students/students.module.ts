import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { StudentsImportService } from './students-import.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [StudentsController],
  providers: [StudentsService, StudentsImportService],
  exports: [StudentsService],
})
export class StudentsModule {}
