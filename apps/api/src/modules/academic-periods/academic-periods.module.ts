import { Module } from '@nestjs/common';
import { AcademicPeriodsController } from './academic-periods.controller';
import { AcademicPeriodsService } from './academic-periods.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AcademicPeriodsController],
  providers: [AcademicPeriodsService],
  exports: [AcademicPeriodsService],
})
export class AcademicPeriodsModule {}
