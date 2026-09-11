import { NotFoundException, ConflictException } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { ClassroomType } from '@prisma/client';

describe('ClassroomsService (GAP-6)', () => {
  let service: ClassroomsService;
  let prismaMock: {
    classroom: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditServiceMock: { log: jest.Mock };

  const institutionId = 'inst-1';

  beforeEach(() => {
    prismaMock = {
      classroom: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    auditServiceMock = { log: jest.fn() };
    service = new ClassroomsService(prismaMock as never, auditServiceMock as never);
  });

  it('should create a classroom', async () => {
    prismaMock.classroom.findUnique.mockResolvedValue(null);
    prismaMock.classroom.create.mockResolvedValue({
      id: 'r-1',
      code: 'A-101',
      type: ClassroomType.AULA,
    });

    const result = await service.create(
      institutionId,
      { code: 'A-101', name: 'Aula 101', capacity: 30, type: ClassroomType.AULA },
      'admin-1',
    );

    expect(result.id).toBe('r-1');
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CLASSROOM_CREATED' }),
    );
  });

  it('should reject duplicate codes within the institution', async () => {
    prismaMock.classroom.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(institutionId, { code: 'A-101', name: 'Otra' }, 'admin-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('should list with search and type filters', async () => {
    prismaMock.classroom.findMany.mockResolvedValue([]);
    prismaMock.classroom.count.mockResolvedValue(0);

    await service.findAll(institutionId, { search: 'lab', type: ClassroomType.LAB_FISICA });

    expect(prismaMock.classroom.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: ClassroomType.LAB_FISICA }),
      }),
    );
  });

  it('should throw NotFound for unknown classroom', async () => {
    prismaMock.classroom.findFirst.mockResolvedValue(null);

    await expect(service.findOne(institutionId, 'missing')).rejects.toThrow(NotFoundException);
  });

  it('should deactivate a classroom', async () => {
    prismaMock.classroom.findFirst.mockResolvedValue({ id: 'r-1', status: 'ACTIVE' });
    prismaMock.classroom.update.mockResolvedValue({ id: 'r-1', status: 'INACTIVE' });

    const result = await service.deactivate(institutionId, 'r-1', 'admin-1');

    expect(result.status).toBe('INACTIVE');
  });
});
