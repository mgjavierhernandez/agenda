import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ScheduleBlocksService } from './schedule-blocks.service';
import { DayOfWeek } from '@prisma/client';

describe('ScheduleBlocksService (GAP-6)', () => {
  let service: ScheduleBlocksService;
  let prismaMock: {
    scheduleBlock: {
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
      scheduleBlock: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    auditServiceMock = { log: jest.fn() };
    service = new ScheduleBlocksService(prismaMock as never, auditServiceMock as never);
  });

  it('should create a block with a configurable time slot', async () => {
    prismaMock.scheduleBlock.findUnique.mockResolvedValue(null);
    prismaMock.scheduleBlock.create.mockResolvedValue({
      id: 'b-1',
      name: 'Bloque 1',
      dayOfWeek: DayOfWeek.MONDAY,
    });

    const result = await service.create(
      institutionId,
      { name: 'Bloque 1', dayOfWeek: DayOfWeek.MONDAY, startTime: '07:00', endTime: '08:00' },
      'admin-1',
    );

    expect(result.id).toBe('b-1');
    expect(prismaMock.scheduleBlock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Bloque 1', dayOfWeek: DayOfWeek.MONDAY }),
      }),
    );
  });

  it('should reject inverted time ranges', async () => {
    await expect(
      service.create(
        institutionId,
        { name: 'X', dayOfWeek: DayOfWeek.TUESDAY, startTime: '09:00', endTime: '08:00' },
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.scheduleBlock.create).not.toHaveBeenCalled();
  });

  it('should reject duplicate name for the same day', async () => {
    prismaMock.scheduleBlock.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(
        institutionId,
        { name: 'Bloque 1', dayOfWeek: DayOfWeek.MONDAY, startTime: '07:00', endTime: '08:00' },
        'admin-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should allow the same name on different days', async () => {
    prismaMock.scheduleBlock.findUnique.mockResolvedValue(null);
    prismaMock.scheduleBlock.create.mockResolvedValue({ id: 'b-2' });

    const result = await service.create(
      institutionId,
      { name: 'Bloque 1', dayOfWeek: DayOfWeek.TUESDAY, startTime: '07:00', endTime: '08:00' },
      'admin-1',
    );

    expect(result.id).toBe('b-2');
  });

  it('should throw NotFound for unknown block', async () => {
    prismaMock.scheduleBlock.findFirst.mockResolvedValue(null);

    await expect(service.findOne(institutionId, 'missing')).rejects.toThrow(NotFoundException);
    await expect(
      service.update(institutionId, 'missing', { name: 'Y' }, 'admin-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should deactivate a block', async () => {
    prismaMock.scheduleBlock.findFirst.mockResolvedValue({ id: 'b-1', status: 'ACTIVE' });
    prismaMock.scheduleBlock.update.mockResolvedValue({ id: 'b-1', status: 'INACTIVE' });

    const result = await service.deactivate(institutionId, 'b-1', 'admin-1');

    expect(result.status).toBe('INACTIVE');
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SCHEDULE_BLOCK_DEACTIVATED' }),
    );
  });
});
