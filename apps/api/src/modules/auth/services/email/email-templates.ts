import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommunicationEmailData, SignatureRequestEmailData } from './email-provider.interface';

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Simple, maintainable email templates. Not a CMS — enough to render a clear
 * subject, plain-text fallback and a basic HTML body that identifies the
 * recipient, institution, action and a link back to the system.
 */
@Injectable()
export class EmailTemplates {
  private readonly appWebUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.appWebUrl = this.configService.get<string>('APP_WEB_URL', '');
  }

  sendPasswordReset(data: { to: string; resetToken: string; expiresInMinutes: number }): RenderedEmail {
    const resetUrl = this.buildUrl('/reset-password', { token: data.resetToken });
    const subject = 'Restablece tu contraseña';
    const text = [
      `Hola,`,
      ``,
      `Recibimos una solicitud para restablecer la contraseña de tu cuenta en Agenda Escolar Digital.`,
      ``,
      `Para continuar, abre el siguiente enlace (válido por ${data.expiresInMinutes} minutos):`,
      resetUrl,
      ``,
      `Si no solicitaste este cambio, ignora este correo.`,
    ].join('\n');
    const html = this.layout(subject, [
      `<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>`,
      `<p><a href="${this.escapeAttr(resetUrl)}">Restablecer contraseña</a> (válido por ${data.expiresInMinutes} minutos)</p>`,
    ]);
    return { subject, text, html };
  }

  sendCommunication(data: CommunicationEmailData): RenderedEmail {
    const subject = data.institutionName
      ? `[${data.institutionName}] ${data.title}`
      : data.title;
    const text = [
      `Hola ${data.recipientName || 'usuario'},`,
      ``,
      data.content,
      ``,
      data.institutionName ? `Institución: ${data.institutionName}` : null,
      this.appWebUrl ? `Inicia sesión en: ${this.appWebUrl}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    const html = this.layout(subject, [
      `<p>Hola <strong>${escapeHtml(data.recipientName || 'usuario')}</strong>,</p>`,
      `<p>${escapeHtml(data.content).replace(/\n/g, '<br/>')}</p>`,
    ]);
    return { subject, text, html };
  }

  sendSignatureRequest(data: SignatureRequestEmailData): RenderedEmail {
    const subject = data.institutionName
      ? `[${data.institutionName}] Solicitud de firma: ${data.title}`
      : `Solicitud de firma: ${data.title}`;
    const due = data.dueDate
      ? `\nFecha límite: ${new Date(data.dueDate).toLocaleDateString('es-CO')}`
      : '';
    const text = [
      `Hola ${data.recipientName || 'usuario'},`,
      ``,
      `Se ha solicitado tu firma para: ${data.title}.`,
      data.description ? `Detalle: ${data.description}` : null,
      due || null,
      this.appWebUrl ? `Revisa y firma en: ${this.appWebUrl}/signatures` : null,
    ]
      .filter(Boolean)
      .join('\n');
    const html = this.layout(subject, [
      `<p>Hola <strong>${escapeHtml(data.recipientName || 'usuario')}</strong>,</p>`,
      `<p>Se ha solicitado tu firma para: <strong>${escapeHtml(data.title)}</strong>.</p>`,
      data.description ? `<p>${escapeHtml(data.description).replace(/\n/g, '<br/>')}</p>` : '',
      data.dueDate ? `<p>Fecha límite: ${new Date(data.dueDate).toLocaleDateString('es-CO')}</p>` : '',
      this.appWebUrl
        ? `<p><a href="${this.escapeAttr(`${this.appWebUrl}/signatures`)}">Revisar y firmar</a></p>`
        : '',
    ]);
    return { subject, text, html };
  }

  private buildUrl(path: string, params: Record<string, string>): string {
    const base = this.appWebUrl || '';
    const qs = new URLSearchParams(params).toString();
    return `${base}${path}${qs ? `?${qs}` : ''}`;
  }

  private escapeAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  private layout(subject: string, bodyParts: string[]): string {
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#2563eb;padding:16px 24px;color:#ffffff;font-size:18px;font-weight:bold;">
          Agenda Escolar Digital
        </td></tr>
        <tr><td style="padding:24px;color:#1f2937;font-size:14px;line-height:1.6;">
          ${bodyParts.join('\n')}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
