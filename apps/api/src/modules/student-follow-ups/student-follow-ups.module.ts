import { Module } from '@nestjs/common';
import { StudentFollowUpsController } from './student-follow-ups.controller';
import { StudentFollowUpsService } from './student-follow-ups.service';
import { FollowUpCategoriesService } from './follow-up-categories.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';
import { FilesModule } from '../files/files.module';
import { StudentFollowUpAuthorizationService } from '../../common/auth/student-follow-up-authorization';
import { PrismaService } from '../../common/prisma';

@Module({
  imports: [AuthModule, AuditModule, FilesModule],
  controllers: [StudentFollowUpsController],
  providers: [
    StudentFollowUpsService,
    FollowUpCategoriesService,
    StudentFollowUpAuthorizationService,
    PrismaService,
  ],
  exports: [StudentFollowUpsService, FollowUpCategoriesService],
})
export class StudentFollowUpsModule {}
