import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';
import { StudentFollowUpsModule } from '../student-follow-ups/student-follow-ups.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsAuthorizationService } from './reports-authorization';
import { PrismaService } from '../../common/prisma';

@Module({
  imports: [AuthModule, AuditModule, StudentFollowUpsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsAuthorizationService, PrismaService],
})
export class ReportsModule {}
