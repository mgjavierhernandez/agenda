import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider, PasswordResetEmailData } from './email-provider.interface';

@Injectable()
export class DevEmailProvider implements EmailProvider {
  private readonly logger = new Logger(DevEmailProvider.name);

  async sendPasswordReset(data: PasswordResetEmailData): Promise<void> {
    this.logger.log(
      `[DEV EMAIL] Password reset for ${data.to}: token=${data.resetToken} (expires in ${data.expiresInMinutes}m)`,
    );
  }
}
