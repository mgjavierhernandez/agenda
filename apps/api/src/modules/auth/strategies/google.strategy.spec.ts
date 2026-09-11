import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';

describe('GoogleStrategy (GAP-4)', () => {
  const makeConfig = (values: Record<string, string | undefined>) =>
    ({
      get: (key: string, fallback?: string) => values[key] ?? fallback,
    }) as unknown as ConfigService;

  it('should report configured only when all three variables are present', () => {
    const full = makeConfig({
      GOOGLE_CLIENT_ID: 'id',
      GOOGLE_CLIENT_SECRET: 'secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/google/callback',
    });
    expect(GoogleStrategy.isConfigured(full)).toBe(true);

    const missing = makeConfig({ GOOGLE_CLIENT_ID: 'id' });
    expect(GoogleStrategy.isConfigured(missing)).toBe(false);

    const empty = makeConfig({});
    expect(GoogleStrategy.isConfigured(empty)).toBe(false);
  });

  it('should map a Google profile to the internal shape', () => {
    const config = makeConfig({
      GOOGLE_CLIENT_ID: 'id',
      GOOGLE_CLIENT_SECRET: 'secret',
      GOOGLE_CALLBACK_URL: 'cb',
    });
    const strategy = new GoogleStrategy(config);

    const result = strategy.validate('at', 'rt', {
      id: 'google-123',
      emails: [{ value: 'Doc@Colegio.edu.co', verified: true }],
      name: { givenName: 'Doc', familyName: 'Colegio' },
      _json: { email_verified: true },
    } as never);

    expect(result).toEqual({
      googleId: 'google-123',
      email: 'doc@colegio.edu.co',
      emailVerified: true,
      firstName: 'Doc',
      lastName: 'Colegio',
    });
  });
});
