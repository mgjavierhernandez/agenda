import { Module } from '@nestjs/common';
import { AttendancesController } from './attendances.controller';
import { AttendancesService } from './attendances.service';
import { AttendanceAuthorizationService } from './attendance-authorization';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';
import { PrismaService } from '../../common/prisma';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AttendancesController],
  providers: [AttendancesService, AttendanceAuthorizationService, PrismaService],
  exports: [AttendancesService],
})
export class AttendancesModule {}
