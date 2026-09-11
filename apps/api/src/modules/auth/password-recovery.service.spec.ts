import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailProvider } from './services/email';
import { AuditService } from '../../common/audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@prisma/client';

describe('AuthService - Password Recovery', () => {
  let service: AuthService;
  let prismaMock: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    passwordResetToken: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    refreshToken: { updateMany: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let passwordServiceMock: jest.Mocked<PasswordService>;
  let tokenServiceMock: jest.Mocked<TokenService>;
  let emailProviderMock: jest.Mocked<EmailProvider>;
  let auditServiceMock: jest.Mocked<AuditService>;
  let configServiceMock: jest.Mocked<ConfigService>;

  beforeEach(() => {
    prismaMock = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      passwordResetToken: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: { updateMany: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn((fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)),
    };

    passwordServiceMock = {
      hash: jest.fn(),
      verify: jest.fn(),
      validatePasswordPolicy: jest.fn(),
    } as unknown as jest.Mocked<PasswordService>;

    tokenServiceMock = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      createRefreshToken: jest.fn(),
      validateRefreshToken: jest.fn(),
      rotateRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;

    emailProviderMock = {
      sendPasswordReset: jest.fn(),
    } as unknown as jest.Mocked<EmailProvider>;

    auditServiceMock = {
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    configServiceMock = {
      get: jest.fn().mockReturnValue('60'),
    } as unknown as jest.Mocked<ConfigService>;

    service = new AuthService(
      prismaMock as never,
      passwordServiceMock,
      tokenServiceMock,
      emailProviderMock,
      auditServiceMock,
      configServiceMock,
    );
  });

  describe('forgotPassword', () => {
    it('should return generic message for existing active user', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', status: UserStatus.ACTIVE };
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.passwordResetToken.create.mockResolvedValue({});
      emailProviderMock.sendPasswordReset.mockResolvedValue(undefined);
      auditServiceMock.log.mockResolvedValue(undefined);

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toContain('Si existe una cuenta');
      expect(emailProviderMock.sendPasswordReset).toHaveBeenCalledTimes(1);
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PASSWORD_RESET_REQUESTED', userId: 'user-1' }),
      );
    });

    it('should return same generic message for unknown email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('unknown@example.com');

      expect(result.message).toContain('Si existe una cuenta');
      expect(emailProviderMock.sendPasswordReset).not.toHaveBeenCalled();
      expect(auditServiceMock.log).not.toHaveBeenCalled();
    });

    it('should return same message for inactive user', async () => {
      const mockUser = { id: 'user-2', email: 'inactive@example.com', status: UserStatus.INACTIVE };
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.forgotPassword('inactive@example.com');

      expect(result.message).toContain('Si existe una cuenta');
      expect(emailProviderMock.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should invalidate previous tokens when requesting new reset', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', status: UserStatus.ACTIVE };
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 2 });
      prismaMock.passwordResetToken.create.mockResolvedValue({});
      emailProviderMock.sendPasswordReset.mockResolvedValue(undefined);
      auditServiceMock.log.mockResolvedValue(undefined);

      await service.forgotPassword('test@example.com');

      expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('should normalize email before lookup', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await service.forgotPassword('  TEST@EXAMPLE.COM  ');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true, email: true, status: true },
      });
    });

    it('should never expose raw token in response', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', status: UserStatus.ACTIVE };
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.passwordResetToken.create.mockResolvedValue({});
      emailProviderMock.sendPasswordReset.mockResolvedValue(undefined);
      auditServiceMock.log.mockResolvedValue(undefined);

      const result = await service.forgotPassword('test@example.com');

      const responseStr = JSON.stringify(result);
      expect(responseStr).not.toMatch(/[A-Za-z0-9_-]{30,}/);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      const mockToken = {
        id: 'token-1',
        userId: 'user-1',
        expiresAt: futureDate,
        usedAt: null,
        user: { id: 'user-1', status: UserStatus.ACTIVE },
      };
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(mockToken);
      passwordServiceMock.validatePasswordPolicy.mockReturnValue({ valid: true });
      passwordServiceMock.hash.mockResolvedValue('new-hash');
      prismaMock.$transaction.mockImplementation(
        async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
      );

      const result = await service.resetPassword('valid-token', 'NewPassword123!');

      expect(result.message).toContain('Password has been reset');
      expect(passwordServiceMock.hash).toHaveBeenCalledWith('NewPassword123!');
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword('invalid-token', 'NewPassword123!')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for already used token', async () => {
      const mockToken = {
        id: 'token-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(),
        user: { id: 'user-1', status: UserStatus.ACTIVE },
      };
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(mockToken);

      await expect(service.resetPassword('used-token', 'NewPassword123!')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const mockToken = {
        id: 'token-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 3600000),
        usedAt: null,
        user: { id: 'user-1', status: UserStatus.ACTIVE },
      };
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(mockToken);

      await expect(service.resetPassword('expired-token', 'NewPassword123!')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for inactive user', async () => {
      const mockToken = {
        id: 'token-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        user: { id: 'user-1', status: UserStatus.INACTIVE },
      };
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(mockToken);

      await expect(service.resetPassword('valid-token', 'NewPassword123!')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should revoke all refresh tokens after reset', async () => {
      const mockToken = {
        id: 'token-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        user: { id: 'user-1', status: UserStatus.ACTIVE },
      };
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(mockToken);
      passwordServiceMock.validatePasswordPolicy.mockReturnValue({ valid: true });
      passwordServiceMock.hash.mockResolvedValue('new-hash');
      prismaMock.$transaction.mockImplementation(
        async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
      );

      await service.resetPassword('valid-token', 'NewPassword123!');

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should invalidate other pending reset tokens', async () => {
      const mockToken = {
        id: 'token-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        user: { id: 'user-1', status: UserStatus.ACTIVE },
      };
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(mockToken);
      passwordServiceMock.validatePasswordPolicy.mockReturnValue({ valid: true });
      passwordServiceMock.hash.mockResolvedValue('new-hash');
      prismaMock.$transaction.mockImplementation(
        async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
      );

      await service.resetPassword('valid-token', 'NewPassword123!');

      expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          usedAt: null,
          id: { not: 'token-1' },
        },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('should create audit log for completed reset', async () => {
      const mockToken = {
        id: 'token-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        user: { id: 'user-1', status: UserStatus.ACTIVE },
      };
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(mockToken);
      passwordServiceMock.validatePasswordPolicy.mockReturnValue({ valid: true });
      passwordServiceMock.hash.mockResolvedValue('new-hash');
      prismaMock.$transaction.mockImplementation(
        async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock),
      );

      await service.resetPassword('valid-token', 'NewPassword123!');

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'PASSWORD_RESET_COMPLETED',
          entityType: 'User',
          entityId: 'user-1',
        }),
      });
    });

    it('should validate password policy before hashing', async () => {
      const mockToken = {
        id: 'token-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        user: { id: 'user-1', status: UserStatus.ACTIVE },
      };
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(mockToken);
      passwordServiceMock.validatePasswordPolicy.mockReturnValue({
        valid: false,
        error: 'Too short',
      });

      await expect(service.resetPassword('valid-token', 'short')).rejects.toThrow(
        BadRequestException,
      );

      expect(passwordServiceMock.hash).not.toHaveBeenCalled();
    });
  });
});
