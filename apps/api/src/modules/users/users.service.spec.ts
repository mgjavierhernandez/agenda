import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserStatus } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: {
    user: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock; create: jest.Mock; update: jest.Mock };
    userInstitution: { findMany: jest.Mock; findUnique: jest.Mock };
    refreshToken: { updateMany: jest.Mock };
  };
  let auditServiceMock: { log: jest.Mock };

  const institutionId = 'inst-1';

  beforeEach(() => {
    prismaMock = {
      user: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
      userInstitution: { findMany: jest.fn(), findUnique: jest.fn() },
      refreshToken: { updateMany: jest.fn() },
    };
    auditServiceMock = { log: jest.fn() };
    service = new UsersService(prismaMock as never, auditServiceMock as never);
  });

  describe('create', () => {
    it('should create user and exclude passwordHash', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'u-1', email: 'test@test.com', firstName: 'Test', lastName: 'User',
        status: UserStatus.ACTIVE, passwordHash: 'hash123', createdAt: new Date(), updatedAt: new Date(),
      });

      const result = await service.create(institutionId, {
        email: 'test@test.com', password: 'password123', firstName: 'Test', lastName: 'User',
      }, 'admin-1');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('test@test.com');
    });

    it('should normalize email to lowercase', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'u-1', email: 'test@test.com', firstName: 'Test', lastName: 'User',
        status: UserStatus.ACTIVE, passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date(),
      });

      await service.create(institutionId, {
        email: 'TEST@TEST.COM', password: 'password123', firstName: 'Test', lastName: 'User',
      }, 'admin-1');

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'test@test.com' }) }),
      );
    });

    it('should reject duplicate email', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create(institutionId, {
          email: 'dup@test.com', password: 'password123', firstName: 'X', lastName: 'Y',
        }, 'admin-1'),
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
        id: 'u-1', email: 'a@b.com', passwordHash: 'hash', firstName: 'A', lastName: 'B', status: UserStatus.ACTIVE,
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
        id: 'u-1', status: UserStatus.ACTIVE, passwordHash: 'hash', email: 'a@b.com',
      });
      prismaMock.user.update.mockResolvedValue({
        id: 'u-1', status: UserStatus.INACTIVE, passwordHash: 'hash', email: 'a@b.com',
      });
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.deactivate(institutionId, 'u-1', 'admin-1');
      expect(result.status).toBe(UserStatus.INACTIVE);
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
    });
  });
});
