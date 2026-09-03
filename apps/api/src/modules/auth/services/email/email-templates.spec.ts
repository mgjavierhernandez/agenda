import { ConfigService } from '@nestjs/config';
import { EmailTemplates } from './email-templates';

function makeConfig(overrides: Record<string, string> = {}): ConfigService {
  const store: Record<string, string> = { APP_WEB_URL: 'https://app.example.com', ...overrides };
  return { get: jest.fn((key: string, def?: string) => store[key] ?? def) } as unknown as ConfigService;
}

describe('EmailTemplates', () => {
  it('builds a password reset email with an APP_WEB_URL link', () => {
    const service = new EmailTemplates(makeConfig());
    const rendered = service.sendPasswordReset({ to: 'a@b.com', resetToken: 'tok123', expiresInMinutes: 60 });
    expect(rendered.subject).toContain('contraseña');
    expect(rendered.text).toContain('tok123');
    expect(rendered.text).toContain('app.example.com');
    expect(rendered.html).toContain('https://app.example.com/reset-password?token=tok123');
    expect(rendered.html).toContain('60 minutos');
  });

  it('builds a communication email with recipient and institution', () => {
    const service = new EmailTemplates(makeConfig());
    const rendered = service.sendCommunication({
      to: 'p@x.com',
      recipientName: 'Pedro',
      institutionName: 'Colegio San José',
      title: 'Inicio de clases',
      content: 'Bienvenidos al nuevo año.',
    });
    expect(rendered.subject).toContain('Inicio de clases');
    expect(rendered.subject).toContain('Colegio San José');
    expect(rendered.text).toContain('Pedro');
    expect(rendered.text).toContain('Bienvenidos al nuevo año.');
    expect(rendered.html).toContain('Colegio San José');
  });

  it('escapes HTML in content to avoid injection', () => {
    const service = new EmailTemplates(makeConfig());
    const rendered = service.sendCommunication({
      to: 'a@b.com',
      recipientName: 'Pepe',
      institutionName: 'Inst',
      title: 'Título',
      content: '<script>alert(1)</script>',
    });
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('&lt;script&gt;');
  });

  it('builds a signature request email', () => {
    const service = new EmailTemplates(makeConfig());
    const rendered = service.sendSignatureRequest({
      to: 's@x.com',
      recipientName: 'Sofía',
      institutionName: 'Inst',
      title: 'Autorización de excursión',
      description: 'Firma requerida',
      dueDate: new Date('2026-02-20T00:00:00Z'),
    });
    expect(rendered.subject).toContain('Autorización de excursión');
    expect(rendered.subject).toContain('Solicitud de firma');
    expect(rendered.text).toContain('Sofía');
    expect(rendered.text).toContain('app.example.com/signatures');
    expect(rendered.html).toContain('app.example.com/signatures');
  });

  it('never leaks secrets or credentials into the email', () => {
    const service = new EmailTemplates(makeConfig());
    const rendered = service.sendPasswordReset({ to: 'a@b.com', resetToken: 'secret-token', expiresInMinutes: 30 });
    expect(rendered.subject).not.toContain('SMTP');
    expect(rendered.subject).not.toContain('password');
  });
});
