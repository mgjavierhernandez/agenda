import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AuthModule } from '../auth/auth.module';
import { StudentFollowUpsModule } from '../student-follow-ups/student-follow-ups.module';

@Module({
  imports: [AuthModule, StudentFollowUpsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
