import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthorizationService } from '../auth/authorization/authorization.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard } from '../auth/tenant/tenant-context.guard';
import { PermissionGuard } from '../auth/authorization/permission.guard';

describe('UsersController (profile self-service)', () => {
  let controller: UsersController;
  let usersService: { findProfile: jest.Mock; upsertProfile: jest.Mock };
  let authz: { hasPermission: jest.Mock };

  const institutionId = 'inst-1';
  const req = (userId: string) =>
    ({ tenant: { institutionId }, user: { userId }, ip: '127.0.0.1' }) as never;

  beforeEach(async () => {
    usersService = { findProfile: jest.fn(), upsertProfile: jest.fn() };
    authz = { hasPermission: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: AuthorizationService, useValue: authz },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantContextGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('allows reading own profile without users:read', async () => {
    usersService.findProfile.mockResolvedValue(null);

    await controller.findProfile(req('user-1'), 'user-1');

    expect(authz.hasPermission).not.toHaveBeenCalled();
    expect(usersService.findProfile).toHaveBeenCalledWith(institutionId, 'user-1');
  });

  it('denies reading another profile without users:read', async () => {
    authz.hasPermission.mockResolvedValue(false);

    await expect(controller.findProfile(req('user-1'), 'user-2')).rejects.toThrow(
      ForbiddenException,
    );
    expect(usersService.findProfile).not.toHaveBeenCalled();
  });

  it('allows reading another profile with users:read', async () => {
    authz.hasPermission.mockResolvedValue(true);
    usersService.findProfile.mockResolvedValue(null);

    await controller.findProfile(req('admin-1'), 'user-2');

    expect(authz.hasPermission).toHaveBeenCalledWith('admin-1', institutionId, 'users:read');
  });

  it('allows updating own profile without users:update', async () => {
    usersService.upsertProfile.mockResolvedValue({ id: 'p1' });

    await controller.upsertProfile(req('user-1'), 'user-1', { phone: '555' });

    expect(authz.hasPermission).not.toHaveBeenCalled();
  });

  it('denies updating another profile without users:update', async () => {
    authz.hasPermission.mockResolvedValue(false);

    await expect(
      controller.upsertProfile(req('user-1'), 'user-2', { phone: '555' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
