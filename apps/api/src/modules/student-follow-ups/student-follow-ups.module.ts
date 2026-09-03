import { Module } from '@nestjs/common';
import { StudentFollowUpsController } from './student-follow-ups.controller';
import { StudentFollowUpsService } from './student-follow-ups.service';
import { FollowUpCategoriesService } from './follow-up-categories.service';
import { FollowUpCitationsService } from './follow-up-citations.service';
import { StudentFollowUpSignatureService } from './student-follow-up-signature.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';
import { FilesModule } from '../files/files.module';
import { SignaturesModule } from '../signatures/signatures.module';
import { StudentFollowUpAuthorizationService } from '../../common/auth/student-follow-up-authorization';
import { PrismaService } from '../../common/prisma';

@Module({
  imports: [AuthModule, AuditModule, FilesModule, SignaturesModule],
  controllers: [StudentFollowUpsController],
  providers: [
    StudentFollowUpsService,
    FollowUpCategoriesService,
    FollowUpCitationsService,
    StudentFollowUpSignatureService,
    StudentFollowUpAuthorizationService,
    PrismaService,
  ],
  exports: [
    StudentFollowUpsService,
    FollowUpCategoriesService,
    FollowUpCitationsService,
    StudentFollowUpSignatureService,
    StudentFollowUpAuthorizationService,
  ],
})
export class StudentFollowUpsModule {}
