import { UnauthorizedException, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailProvider } from './services/email';
import { AuditService } from '../../common/audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { UserStatus, InstitutionStatus, MembershipStatus, DocumentType } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    institution: { findUnique: jest.Mock };
    userInstitution: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    userProfile: { findFirst: jest.Mock };
    student: { findFirst: jest.Mock; update: jest.Mock };
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
        create: jest.fn(),
        update: jest.fn(),
      },
      institution: { findUnique: jest.fn() },
      userInstitution: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      userProfile: { findFirst: jest.fn() },
      student: { findFirst: jest.fn(), update: jest.fn() },
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

  describe('selfRegister (GAP-2)', () => {
    const dto = {
      email: 'nuevo@colegio.edu.co',
      password: 'Password123',
      firstName: 'Nuevo',
      lastName: 'Docente',
      institutionId: 'inst-1',
      requestedRole: 'TEACHER' as const,
    };

    function mockActiveInstitution() {
      prismaMock.institution.findUnique.mockResolvedValue({ id: 'inst-1', status: InstitutionStatus.ACTIVE });
    }

    it('should create an INACTIVE user with a PENDING membership and no tokens', async () => {
      mockActiveInstitution();
      passwordServiceMock.validatePasswordPolicy.mockReturnValue({ valid: true });
      prismaMock.user.findUnique.mockResolvedValue(null);
      passwordServiceMock.hash.mockResolvedValue('hashed');
      prismaMock.user.create.mockResolvedValue({ id: 'u-new', status: UserStatus.INACTIVE });
      prismaMock.userInstitution.create.mockResolvedValue({ id: 'm-new', status: MembershipStatus.PENDING });

      const result = await service.selfRegister(dto);

      expect(result.status).toBe('PENDING');
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: UserStatus.INACTIVE }),
        }),
      );
      expect(prismaMock.userInstitution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: MembershipStatus.PENDING, requestedRole: 'TEACHER' }),
        }),
      );
      expect(tokenServiceMock.generateAccessToken).not.toHaveBeenCalled();
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SELF_REGISTER_REQUESTED' }),
      );
    });

    it('should reject unknown institutions', async () => {
      prismaMock.institution.findUnique.mockResolvedValue(null);

      await expect(service.selfRegister(dto)).rejects.toThrow(NotFoundException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should reject duplicate requests for the same institution', async () => {
      mockActiveInstitution();
      passwordServiceMock.validatePasswordPolicy.mockReturnValue({ valid: true });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1' });
      prismaMock.userInstitution.findUnique.mockResolvedValue({ id: 'm-1', status: MembershipStatus.PENDING });

      await expect(service.selfRegister(dto)).rejects.toThrow(ConflictException);
    });

    it('should allow re-request after REJECTED', async () => {
      mockActiveInstitution();
      passwordServiceMock.validatePasswordPolicy.mockReturnValue({ valid: true });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1' });
      prismaMock.userInstitution.findUnique.mockResolvedValue({ id: 'm-1', status: MembershipStatus.REJECTED });
      prismaMock.userInstitution.update.mockResolvedValue({ id: 'm-1', status: MembershipStatus.PENDING });

      const result = await service.selfRegister(dto);

      expect(result.status).toBe('PENDING');
      expect(prismaMock.userInstitution.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: MembershipStatus.PENDING }) }),
      );
    });

    it('should block login for the INACTIVE self-registered user', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u-new',
        email: 'nuevo@colegio.edu.co',
        passwordHash: 'hashed',
        status: UserStatus.INACTIVE,
      });

      await expect(service.login('nuevo@colegio.edu.co', 'Password123')).rejects.toThrow(UnauthorizedException);
      expect(passwordServiceMock.verify).not.toHaveBeenCalled();
    });

    it('should reject weak passwords', async () => {
      mockActiveInstitution();
      passwordServiceMock.validatePasswordPolicy.mockReturnValue({ valid: false, error: 'too weak' });

      await expect(service.selfRegister({ ...dto, password: 'weak' })).rejects.toThrow(BadRequestException);
    });

    it('should link an unclaimed student record matching the profile document', async () => {
      mockActiveInstitution();
      passwordServiceMock.validatePasswordPolicy.mockReturnValue({ valid: true });
      prismaMock.user.findUnique.mockResolvedValue(null);
      passwordServiceMock.hash.mockResolvedValue('hashed');
      prismaMock.user.create.mockResolvedValue({ id: 'u-new', status: UserStatus.INACTIVE });
      prismaMock.userInstitution.create.mockResolvedValue({ id: 'm-new', status: MembershipStatus.PENDING });
      prismaMock.student.findFirst.mockResolvedValue({ id: 'student-1' });
      prismaMock.student.update.mockResolvedValue({ id: 'student-1' });

      await service.selfRegister({
        ...dto,
        requestedRole: 'STUDENT',
        profile: { documentType: DocumentType.NATIONAL_ID, documentNumber: '555' },
      });

      expect(prismaMock.student.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'student-1' }, data: { userId: 'u-new' } }),
      );
    });
  });

  describe('loginWithGoogle (GAP-4)', () => {
    const googleProfile = {
      googleId: 'google-123',
      email: 'doc@colegio.edu.co',
      emailVerified: true,
      firstName: 'Doc',
      lastName: 'Google',
    };

    function mockTokenIssuance() {
      tokenServiceMock.generateAccessToken.mockReturnValue('access');
      tokenServiceMock.generateRefreshToken.mockReturnValue('refresh');
      tokenServiceMock.createRefreshToken.mockResolvedValue({} as never);
    }

    it('should log in an existing user by googleId and issue the standard JWT scheme', async () => {
      mockTokenIssuance();
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1', email: 'doc@colegio.edu.co', status: UserStatus.ACTIVE });

      const result = await service.loginWithGoogle(googleProfile);

      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'GOOGLE_LOGIN' }),
      );
    });

    it('should link googleId on first login by verified email', async () => {
      mockTokenIssuance();
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // no user by googleId
        .mockResolvedValueOnce({ id: 'u-1', email: 'doc@colegio.edu.co', status: UserStatus.ACTIVE, googleId: null });
      prismaMock.user.update.mockResolvedValue({ id: 'u-1' });

      const result = await service.loginWithGoogle(googleProfile);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ googleId: 'google-123' }) }),
      );
      expect(result.accessToken).toBe('access');
    });

    it('should reject unknown Google identities without auto-provisioning', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.loginWithGoogle(googleProfile)).rejects.toThrow(ForbiddenException);
      expect(tokenServiceMock.generateAccessToken).not.toHaveBeenCalled();
    });

    it('should block INACTIVE users even with a valid Google identity', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1', email: 'doc@colegio.edu.co', status: UserStatus.INACTIVE });

      await expect(service.loginWithGoogle(googleProfile)).rejects.toThrow(UnauthorizedException);
    });

    it('should require a verified email', async () => {
      await expect(
        service.loginWithGoogle({ ...googleProfile, emailVerified: false }),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });
  });
});