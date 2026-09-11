import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserStatus, DocumentType, Prisma } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: {
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    userInstitution: { findMany: jest.Mock; findUnique: jest.Mock };
    userProfile: { findFirst: jest.Mock; findUnique: jest.Mock; upsert: jest.Mock };
    student: { findFirst: jest.Mock; update: jest.Mock };
    refreshToken: { updateMany: jest.Mock };
  };
  let auditServiceMock: { log: jest.Mock };

  const institutionId = 'inst-1';

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userInstitution: { findMany: jest.fn(), findUnique: jest.fn() },
      userProfile: { findFirst: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
      student: { findFirst: jest.fn(), update: jest.fn() },
      refreshToken: { updateMany: jest.fn() },
    };
    auditServiceMock = { log: jest.fn() };
    service = new UsersService(prismaMock as never, auditServiceMock as never);
  });

  describe('create', () => {
    it('should create user and exclude passwordHash', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'u-1',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        status: UserStatus.ACTIVE,
        passwordHash: 'hash123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        institutionId,
        {
          email: 'test@test.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        },
        'admin-1',
      );

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('test@test.com');
    });

    it('should normalize email to lowercase', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'u-1',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        status: UserStatus.ACTIVE,
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create(
        institutionId,
        {
          email: 'TEST@TEST.COM',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        },
        'admin-1',
      );

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'test@test.com' }) }),
      );
    });

    it('should reject duplicate email', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create(
          institutionId,
          {
            email: 'dup@test.com',
            password: 'password123',
            firstName: 'X',
            lastName: 'Y',
          },
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return users in institution', async () => {
      prismaMock.userInstitution.findMany.mockResolvedValue([{ userId: 'u-1' }]);
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, {});
      expect(result.data).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should find user in institution', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({ userId: 'u-1' });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'a@b.com',
        passwordHash: 'hash',
        firstName: 'A',
        lastName: 'B',
        status: UserStatus.ACTIVE,
      });

      const result = await service.findOne(institutionId, 'u-1');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw if user not in institution', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue(null);
      await expect(service.findOne(institutionId, 'u-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate user and revoke tokens', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({ userId: 'u-1' });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u-1',
        status: UserStatus.ACTIVE,
        passwordHash: 'hash',
        email: 'a@b.com',
      });
      prismaMock.user.update.mockResolvedValue({
        id: 'u-1',
        status: UserStatus.INACTIVE,
        passwordHash: 'hash',
        email: 'a@b.com',
      });
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.deactivate(institutionId, 'u-1', 'admin-1');
      expect(result.status).toBe(UserStatus.INACTIVE);
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
    });
  });

  describe('user profile (GAP-1)', () => {
    const profileDto = {
      documentType: DocumentType.NATIONAL_ID,
      documentNumber: '12345678',
      phone: '3001234567',
      address: 'Calle 1 # 2-3',
      birthDate: '1990-05-01',
      profession: 'Docente de Matemáticas',
      bio: 'Perfil profesional',
    };

    it('should create user with nested profile', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.userProfile.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'u-1',
        email: 't@t.com',
        firstName: 'T',
        lastName: 'U',
        status: UserStatus.ACTIVE,
        passwordHash: 'hash',
        profiles: [],
      });

      await service.create(
        institutionId,
        {
          email: 't@t.com',
          password: 'password123',
          firstName: 'T',
          lastName: 'U',
          profile: profileDto,
        },
        'admin-1',
      );

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            profiles: expect.objectContaining({
              create: expect.objectContaining({ documentNumber: '12345678', phone: '3001234567' }),
            }),
          }),
        }),
      );
    });

    it('should reject profile with documentNumber but no documentType', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          institutionId,
          {
            email: 't@t.com',
            password: 'password123',
            firstName: 'T',
            lastName: 'U',
            profile: { documentNumber: '123' },
          },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should reject duplicate document in the same institution', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.userProfile.findFirst.mockResolvedValue({ id: 'p-1' });

      await expect(
        service.create(
          institutionId,
          {
            email: 't@t.com',
            password: 'password123',
            firstName: 'T',
            lastName: 'U',
            profile: profileDto,
          },
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should upsert profile for a member user', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({ userId: 'u-1' });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1' });
      prismaMock.userProfile.findFirst.mockResolvedValue(null);
      prismaMock.userProfile.upsert.mockResolvedValue({ id: 'p-1', userId: 'u-1', ...profileDto });

      const result = await service.upsertProfile(institutionId, 'u-1', profileDto, 'admin-1');

      expect(result.id).toBe('p-1');
      expect(prismaMock.userProfile.upsert).toHaveBeenCalled();
    });

    it('should reject upsert when user is not a member', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertProfile(institutionId, 'u-1', profileDto, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should map P2002 race on document to ConflictException', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({ userId: 'u-1' });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1' });
      prismaMock.userProfile.findFirst.mockResolvedValue(null);
      prismaMock.userProfile.upsert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.upsertProfile(institutionId, 'u-1', profileDto, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should return null profile when not set', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({ userId: 'u-1' });
      prismaMock.userProfile.findUnique.mockResolvedValue(null);

      await expect(service.findProfile(institutionId, 'u-1')).resolves.toBeNull();
    });

    it('should link an unclaimed student record matching the profile document', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.userProfile.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: 'u-1', email: 's@t.com', passwordHash: 'h' });
      prismaMock.student.findFirst.mockResolvedValue({ id: 'student-1' });
      prismaMock.student.update.mockResolvedValue({ id: 'student-1' });

      await service.create(
        institutionId,
        {
          email: 's@t.com',
          password: 'password123',
          firstName: 'S',
          lastName: 'T',
          profile: profileDto,
        },
        'admin-1',
      );

      expect(prismaMock.student.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'student-1' }, data: { userId: 'u-1' } }),
      );
    });

    it('should not link when no unclaimed student matches', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.userProfile.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: 'u-1', email: 's@t.com', passwordHash: 'h' });
      prismaMock.student.findFirst.mockResolvedValue(null);

      await service.create(
        institutionId,
        {
          email: 's@t.com',
          password: 'password123',
          firstName: 'S',
          lastName: 'T',
          profile: profileDto,
        },
        'admin-1',
      );

      expect(prismaMock.student.update).not.toHaveBeenCalled();
    });
  });
});
