import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID', ''),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET', ''),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL', ''),
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): GoogleProfile {
    const email = profile.emails?.[0]?.value?.toLowerCase().trim() ?? '';
    return {
      googleId: profile.id,
      email,
      emailVerified:
        profile.emails?.[0]?.verified === true || profile._json?.email_verified === true,
      firstName: profile.name?.givenName ?? '',
      lastName: profile.name?.familyName ?? '',
    };
  }

  static isConfigured(configService: ConfigService): boolean {
    return Boolean(
      configService.get<string>('GOOGLE_CLIENT_ID') &&
      configService.get<string>('GOOGLE_CLIENT_SECRET') &&
      configService.get<string>('GOOGLE_CALLBACK_URL'),
    );
  }
}
