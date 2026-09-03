export interface PasswordResetEmailData {
  to: string;
  resetToken: string;
  expiresInMinutes: number;
}

export interface CommunicationEmailData {
  to: string;
  recipientName: string;
  institutionName: string;
  title: string;
  content: string;
}

export interface SignatureRequestEmailData {
  to: string;
  recipientName: string;
  institutionName: string;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
}

export interface EmailProvider {
  sendPasswordReset(data: PasswordResetEmailData): Promise<void>;
  sendCommunication(data: CommunicationEmailData): Promise<void>;
  sendSignatureRequest(data: SignatureRequestEmailData): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EmailProvider');
