import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailProvider } from './services/email';
import { AuditService } from '../../common/audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: {
    user: { findUnique: jest.Mock };
    passwordResetToken: { updateMany: jest.Mock; create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    refreshToken: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let passwordServiceMock: jest.Mocked<PasswordService>;
  let tokenServiceMock: jest.Mocked<TokenService>;
  let emailProviderMock: jest.Mocked<EmailProvider>;
  let auditServiceMock: jest.Mocked<AuditService>;
  let configServiceMock: jest.Mocked<ConfigService>;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
      },
      passwordResetToken: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((fns: unknown[]) => Promise.all(fns)),
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

  describe('login', () => {
    it('should return user and tokens for valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        status: UserStatus.ACTIVE,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      passwordServiceMock.verify.mockResolvedValue(true);
      tokenServiceMock.generateAccessToken.mockReturnValue('access-token');
      tokenServiceMock.generateRefreshToken.mockReturnValue('refresh-token');
      tokenServiceMock.createRefreshToken.mockResolvedValue(undefined);

      const result = await service.login('test@example.com', 'password123');

      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.login('nonexistent@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        status: UserStatus.ACTIVE,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      passwordServiceMock.verify.mockResolvedValue(false);

      await expect(service.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        status: UserStatus.INACTIVE,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.login('test@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for suspended user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        status: UserStatus.SUSPENDED,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.login('test@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should normalize email to lowercase and trimmed', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        status: UserStatus.ACTIVE,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      passwordServiceMock.verify.mockResolvedValue(true);
      tokenServiceMock.generateAccessToken.mockReturnValue('access-token');
      tokenServiceMock.generateRefreshToken.mockReturnValue('refresh-token');
      tokenServiceMock.createRefreshToken.mockResolvedValue(undefined);

      await service.login('  TEST@EXAMPLE.COM  ', 'password123');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true, email: true, passwordHash: true, status: true },
      });
    });
  });

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      tokenServiceMock.validateRefreshToken.mockResolvedValue({
        userId: 'user-123',
        tokenId: 'token-123',
      });
      tokenServiceMock.rotateRefreshToken.mockResolvedValue({
        newAccessToken: 'new-access-token',
        newRefreshToken: 'new-refresh-token',
      });

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      tokenServiceMock.validateRefreshToken.mockResolvedValue(null);

      await expect(service.refresh('invalid-refresh-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      tokenServiceMock.revokeRefreshToken.mockResolvedValue(true);

      await expect(service.logout('refresh-token')).resolves.toBeUndefined();
      expect(tokenServiceMock.revokeRefreshToken).toHaveBeenCalledWith('refresh-token');
    });
  });

  describe('getProfile', () => {
    it('should return user profile for valid user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        status: UserStatus.ACTIVE,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-123');

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });
});