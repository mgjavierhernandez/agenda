import { Module } from '@nestjs/common';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { AgendaEventsController } from './agenda-events.controller';
import { AgendaEventsService } from './agenda-events.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AgendaController, AgendaEventsController],
  providers: [AgendaService, AgendaEventsService],
  exports: [AgendaService, AgendaEventsService],
})
export class AgendaModule {}
