export interface PasswordResetEmailData {
  to: string;
  resetToken: string;
  expiresInMinutes: number;
}

export interface EmailProvider {
  sendPasswordReset(data: PasswordResetEmailData): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EmailProvider');
