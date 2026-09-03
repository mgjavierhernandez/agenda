import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import {
  DevEmailProvider,
  EMAIL_PROVIDER,
  EmailTemplates,
  SmtpEmailProvider,
} from './services/email';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AccessTokenGuard } from './guards/access-token.guard';
import { TenantContextService } from './tenant/tenant-context.service';
import { TenantContextGuard } from './tenant/tenant-context.guard';
import { AuthorizationService } from './authorization/authorization.service';
import { PermissionGuard } from './authorization/permission.guard';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_ACCESS_SECRET');
        const expiresIn = configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as StringValue,
          },
        };
      },
      inject: [ConfigService],
    }),
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    EmailTemplates,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (configService: ConfigService, templates: EmailTemplates) => {
        const smtpHost = configService.get<string>('SMTP_HOST', '');
        // Real SMTP sender when configured; otherwise the dev stub (local/CI).
        return smtpHost ? new SmtpEmailProvider(configService, templates) : new DevEmailProvider();
      },
      inject: [ConfigService, EmailTemplates],
    },
    JwtStrategy,
    AccessTokenGuard,
    TenantContextService,
    TenantContextGuard,
    AuthorizationService,
    PermissionGuard,
  ],
  exports: [
    AuthService,
    AccessTokenGuard,
    TenantContextService,
    TenantContextGuard,
    AuthorizationService,
    PermissionGuard,
    EMAIL_PROVIDER,
    EmailTemplates,
  ],
})
export class AuthModule {}