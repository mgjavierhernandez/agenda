import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { SecurityModule } from './common/security/security.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { StudentsModule } from './modules/students/students.module';
import { CoursesModule } from './modules/courses/courses.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { GradesModule } from './modules/grades/grades.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { SignaturesModule } from './modules/signatures/signatures.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SchoolGradesModule } from './modules/school-grades/school-grades.module';
import { AcademicPeriodsModule } from './modules/academic-periods/academic-periods.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { TeacherAssignmentsModule } from './modules/teacher-assignments/teacher-assignments.module';
import { TaskAssignmentsModule } from './modules/task-assignments/task-assignments.module';
import { TaskSubmissionsModule } from './modules/task-submissions/task-submissions.module';
import { CommunicationRecipientsModule } from './modules/communication-recipients/communication-recipients.module';
import { FilesModule } from './modules/files/files.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';
import { UsersModule } from './modules/users/users.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { RolesModule } from './modules/roles/roles.module';
import { AgendaModule } from './modules/agenda/agenda.module';
import { StudentFollowUpsModule } from './modules/student-follow-ups/student-follow-ups.module';
import { AttendancesModule } from './modules/attendances/attendances.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('NODE_ENV', 'development');
        const isTest = nodeEnv === 'test';
        return {
          throttlers: [
            {
              ttl: isTest ? 1000 : config.get<number>('RATE_LIMIT_TTL', 60) * 1000,
              limit: isTest ? 10000 : config.get<number>('RATE_LIMIT_LIMIT', 50),
            },
          ],
        };
      },
    }),
    PrismaModule,
    SecurityModule,
    HealthModule,
    AuthModule,
    InstitutionsModule,
    UsersModule,
    MembershipsModule,
    RolesModule,
    StudentsModule,
    CoursesModule,
    SubjectsModule,
    GradesModule,
    SchedulesModule,
    TasksModule,
    CommunicationsModule,
    SignaturesModule,
    NotificationsModule,
    SchoolGradesModule,
    AcademicPeriodsModule,
    GuardiansModule,
    EnrollmentsModule,
    TeacherAssignmentsModule,
    TaskAssignmentsModule,
    TaskSubmissionsModule,
    CommunicationRecipientsModule,
    FilesModule,
    AgendaModule,
    StudentFollowUpsModule,
    AttendancesModule,
    ReportsModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
