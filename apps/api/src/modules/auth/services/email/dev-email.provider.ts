import { Injectable, Logger } from '@nestjs/common';
import {
  CommunicationEmailData,
  EmailProvider,
  PasswordResetEmailData,
  SignatureRequestEmailData,
} from './email-provider.interface';

/**
 * Development email provider: logs the would-be email instead of sending.
 * Used when SMTP is not configured (e.g. local dev / CI without credentials).
 * This is NOT a real sender — production must configure SMTP_* env vars to
 * activate SmtpEmailProvider.
 */
@Injectable()
export class DevEmailProvider implements EmailProvider {
  private readonly logger = new Logger(DevEmailProvider.name);

  async sendPasswordReset(data: PasswordResetEmailData): Promise<void> {
    this.logger.log(
      `[DEV EMAIL] Password reset for ${data.to}: token=${data.resetToken} (expires in ${data.expiresInMinutes}m)`,
    );
  }

  async sendCommunication(data: CommunicationEmailData): Promise<void> {
    this.logger.log(`[DEV EMAIL] Communication to ${data.to}: "${data.title}"`);
  }

  async sendSignatureRequest(data: SignatureRequestEmailData): Promise<void> {
    this.logger.log(`[DEV EMAIL] Signature request to ${data.to}: "${data.title}"`);
  }
}
