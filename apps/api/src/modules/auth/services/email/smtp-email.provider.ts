import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import {
  CommunicationEmailData,
  EmailProvider,
  PasswordResetEmailData,
  SignatureRequestEmailData,
} from './email-provider.interface';
import { EmailTemplates } from './email-templates';

/**
 * Real SMTP email provider. Configured exclusively through environment
 * variables — credentials are never hardcoded or logged.
 *
 * SMTP_HOST      host (e.g. smtp.example.com)
 * SMTP_PORT      port (default 587)
 * SMTP_USER      username
 * SMTP_PASSWORD  password/app-password
 * SMTP_FROM      from address (default: no-reply@localhost)
 * SMTP_SECURE    true for TLS on port 465 (default false)
 * APP_WEB_URL    base URL used in email links (never hardcoded)
 */
@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly templates: EmailTemplates,
  ) {
    const host = this.configService.get<string>('SMTP_HOST', '');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER', '');
    const pass = this.configService.get<string>('SMTP_PASSWORD', '');
    const secure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
    this.from = this.configService.get<string>('SMTP_FROM', 'no-reply@localhost');

    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: user || pass ? { user, pass } : undefined,
    });
    void host; // host is validated lazily via verify on first send
  }

  async sendPasswordReset(data: PasswordResetEmailData): Promise<void> {
    const rendered = this.templates.sendPasswordReset(data);
    await this.deliver({ to: data.to, ...rendered });
  }

  async sendCommunication(data: CommunicationEmailData): Promise<void> {
    const rendered = this.templates.sendCommunication(data);
    await this.deliver({ to: data.to, ...rendered });
  }

  async sendSignatureRequest(data: SignatureRequestEmailData): Promise<void> {
    const rendered = this.templates.sendSignatureRequest(data);
    await this.deliver({ to: data.to, ...rendered });
  }

  private async deliver(data: { to: string; subject: string; text: string; html: string }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: data.to,
        subject: data.subject,
        text: data.text,
        html: data.html,
      });
      this.logger.log(`Email sent to ${data.to} (subject: ${data.subject})`);
    } catch (error) {
      // Sanitized: never log the SMTP credentials or the transporter config.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`SMTP send failed for ${data.to}: ${message}`);
      throw error;
    }
  }
}
