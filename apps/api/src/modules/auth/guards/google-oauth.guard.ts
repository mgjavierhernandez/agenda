import { Injectable, ExecutionContext, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { GoogleStrategy } from '../strategies/google.strategy';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    if (!GoogleStrategy.isConfigured(this.configService)) {
      throw new ServiceUnavailableException('Google authentication is not configured');
    }
    return super.canActivate(context);
  }

  override handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    _info?: unknown,
    _context?: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException('Google authentication failed');
    }
    return user;
  }
}
