import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;
  let prismaMock: { role: { findMany: jest.Mock } };

  const institutionId = 'inst-1';

  beforeEach(() => {
    prismaMock = { role: { findMany: jest.fn() } };
    service = new RolesService(prismaMock as never);
  });

  it('should return tenant roles with assignable flags', async () => {
    prismaMock.role.findMany.mockResolvedValue([
      {
        id: 'r-1',
        name: 'TEACHER',
        description: 'Teacher',
        isSystem: true,
        roleType: 'TENANT',
        institutionId,
      },
      {
        id: 'r-2',
        name: 'CUSTOM',
        description: 'Custom role',
        isSystem: false,
        roleType: 'TENANT',
        institutionId,
      },
    ]);

    const result = await service.findAll(institutionId);

    expect(result).toEqual([
      { id: 'r-1', name: 'TEACHER', description: 'Teacher', isSystem: true, assignable: true },
      { id: 'r-2', name: 'CUSTOM', description: 'Custom role', isSystem: false, assignable: false },
    ]);
  });

  it('should query tenant roles scoped to the institution', async () => {
    prismaMock.role.findMany.mockResolvedValue([]);
    await service.findAll(institutionId);

    const arg = prismaMock.role.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ institutionId, roleType: 'TENANT' });
  });
});
