import { Module } from '@nestjs/common';
import { CommunicationRecipientsController } from './communication-recipients.controller';
import { CommunicationRecipientsService } from './communication-recipients.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [CommunicationRecipientsController],
  providers: [CommunicationRecipientsService],
  exports: [CommunicationRecipientsService],
})
export class CommunicationRecipientsModule {}
