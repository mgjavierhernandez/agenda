import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AgendaEventsService } from './agenda-events.service';
import { AgendaEventStatus, CommunicationAudience } from '@prisma/client';

describe('AgendaEventsService', () => {
  let service: AgendaEventsService;
  let prismaMock: {
    globalUserRole: { findFirst: jest.Mock };
    userInstitution: { findUnique: jest.Mock };
    student: { findFirst: jest.Mock };
    guardianStudent: { findMany: jest.Mock };
    agendaEvent: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditMock: { log: jest.Mock };

  const institutionId = 'inst-1';
  const userId = 'user-1';

  const baseEvent = {
    id: 'event-1',
    institutionId,
    createdById: userId,
    title: 'Reunion de padres',
    description: null,
    startAt: new Date('2026-09-01T14:00:00.000Z'),
    endAt: new Date('2026-09-01T16:00:00.000Z'),
    location: null,
    audience: CommunicationAudience.ALL,
    status: AgendaEventStatus.ACTIVE,
    createdAt: new Date('2026-08-30T10:00:00.000Z'),
    updatedAt: new Date('2026-08-30T10:00:00.000Z'),
  };

  beforeEach(() => {
    prismaMock = {
      globalUserRole: { findFirst: jest.fn() },
      userInstitution: { findUnique: jest.fn() },
      student: { findFirst: jest.fn() },
      guardianStudent: { findMany: jest.fn() },
      agendaEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };
    auditMock = { log: jest.fn() };

    service = new AgendaEventsService(prismaMock as never, auditMock as never);

    prismaMock.globalUserRole.findFirst.mockResolvedValue(null);
    prismaMock.userInstitution.findUnique.mockResolvedValue({
      id: 'mem-1',
      userId,
      institutionId,
      status: 'ACTIVE',
      roles: [{ role: { name: 'INSTITUTION_ADMIN' } }],
    });
    prismaMock.student.findFirst.mockResolvedValue(null);
    prismaMock.guardianStudent.findMany.mockResolvedValue([]);
  });

  describe('create', () => {
    it('should create an event forcing tenant and creator from the server', async () => {
      prismaMock.agendaEvent.create.mockResolvedValue(baseEvent);

      const result = await service.create(
        institutionId,
        {
          title: 'Reunion de padres',
          startAt: '2026-09-01T14:00:00.000Z',
          endAt: '2026-09-01T16:00:00.000Z',
        },
        userId,
        '127.0.0.1',
      );

      expect(prismaMock.agendaEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          institutionId,
          createdById: userId,
          title: 'Reunion de padres',
          audience: CommunicationAudience.ALL,
        }),
      });
      expect(result.id).toBe('event-1');
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'EVENT_CREATED',
          entityType: 'AgendaEvent',
          entityId: 'event-1',
          userId,
          institutionId,
          ipAddress: '127.0.0.1',
        }),
      );
    });

    it('should preserve the requested audience when provided', async () => {
      prismaMock.agendaEvent.create.mockResolvedValue(baseEvent);

      await service.create(
        institutionId,
        {
          title: 'Reunion de padres',
          description: 'Convocatoria',
          startAt: '2026-09-01T14:00:00.000Z',
          endAt: '2026-09-01T16:00:00.000Z',
          location: 'Salon de actos',
          audience: CommunicationAudience.PARENTS,
        },
        userId,
      );

      expect(prismaMock.agendaEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          audience: CommunicationAudience.PARENTS,
          location: 'Salon de actos',
          description: 'Convocatoria',
        }),
      });
    });

    it('should reject endAt before or equal to startAt', async () => {
      await expect(
        service.create(
          institutionId,
          {
            title: 'Mal evento',
            startAt: '2026-09-01T16:00:00.000Z',
            endAt: '2026-09-01T14:00:00.000Z',
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create(
          institutionId,
          {
            title: 'Mal evento',
            startAt: '2026-09-01T14:00:00.000Z',
            endAt: '2026-09-01T14:00:00.000Z',
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid date strings', async () => {
      await expect(
        service.create(
          institutionId,
          {
            title: 'Mal evento',
            startAt: 'not-a-date',
            endAt: '2026-09-01T16:00:00.000Z',
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return a paginated, tenant-scoped list', async () => {
      prismaMock.agendaEvent.findMany.mockResolvedValue([baseEvent]);
      prismaMock.agendaEvent.count.mockResolvedValue(1);

      const result = await service.findAll(institutionId, { page: 1, limit: 20 }, userId);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
      expect(prismaMock.agendaEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institutionId }),
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should support date range, status, audience and search filters', async () => {
      prismaMock.agendaEvent.findMany.mockResolvedValue([]);
      prismaMock.agendaEvent.count.mockResolvedValue(0);

      await service.findAll(
        institutionId,
        {
          start: '2026-09-01T00:00:00.000Z',
          end: '2026-09-30T23:59:59.000Z',
          status: AgendaEventStatus.ACTIVE,
          audience: CommunicationAudience.ALL,
          search: 'reunion',
        },
        userId,
      );

      const createArgs = prismaMock.agendaEvent.findMany.mock.calls[0][0] as {
        where: { AND: Array<Record<string, unknown>>; institutionId: string };
      };
      expect(createArgs.where.institutionId).toBe(institutionId);
      expect(createArgs.where.AND.some((c) => 'status' in c && (c as { status: string }).status === 'ACTIVE')).toBe(true);
      expect(createArgs.where.AND.some((c) => 'OR' in c)).toBe(true);
    });

    it('should reject a reversed date range', async () => {
      await expect(
        service.findAll(
          institutionId,
          { start: '2026-10-01T00:00:00.000Z', end: '2026-09-01T00:00:00.000Z' },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should scope parent visibility to ALL and PARENTS audiences', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({
        id: 'mem-2',
        userId,
        institutionId,
        status: 'ACTIVE',
        roles: [{ role: { name: 'PARENT' } }],
      });
      prismaMock.guardianStudent.findMany.mockResolvedValue([
        { studentId: 'student-1' },
      ]);
      prismaMock.agendaEvent.findMany.mockResolvedValue([]);
      prismaMock.agendaEvent.count.mockResolvedValue(0);

      await service.findAll(institutionId, {}, userId);

      const createArgs = prismaMock.agendaEvent.findMany.mock.calls[0][0] as {
        where: { AND: Array<Record<string, unknown>> };
      };
      const audienceEntry = createArgs.where.AND.find(
        (c) => 'audience' in c,
      ) as { audience: { in: string[] } };
      expect(audienceEntry.audience.in).toEqual([
        CommunicationAudience.ALL,
        CommunicationAudience.PARENTS,
      ]);
    });
  });

  describe('findOne', () => {
    it('should return the event for an authorized user', async () => {
      prismaMock.agendaEvent.findFirst.mockResolvedValue(baseEvent);

      const result = await service.findOne(institutionId, 'event-1', userId);

      expect(result.id).toBe('event-1');
      expect(prismaMock.agendaEvent.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'event-1', institutionId }),
        }),
      );
    });

    it('should return 404 for a non-existent or cross-tenant event', async () => {
      prismaMock.agendaEvent.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('other-institution', 'event-1', userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not leak TEACHERS-only events to a parent (404)', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({
        id: 'mem-2',
        userId,
        institutionId,
        status: 'ACTIVE',
        roles: [{ role: { name: 'PARENT' } }],
      });
      prismaMock.guardianStudent.findMany.mockResolvedValue([
        { studentId: 'student-1' },
      ]);
      prismaMock.agendaEvent.findFirst.mockResolvedValue(null);

      await expect(service.findOne(institutionId, 'event-1', userId)).rejects.toThrow(
        NotFoundException,
      );

      const findFirstArgs = prismaMock.agendaEvent.findFirst.mock.calls[0][0] as {
        where: { audience: { in: string[] } };
      };
      expect(findFirstArgs.where.audience.in).toEqual([
        CommunicationAudience.ALL,
        CommunicationAudience.PARENTS,
      ]);
    });

    it('should allow a teacher to see their own events regardless of audience', async () => {
      prismaMock.userInstitution.findUnique.mockResolvedValue({
        id: 'mem-3',
        userId,
        institutionId,
        status: 'ACTIVE',
        roles: [{ role: { name: 'TEACHER' } }],
      });
      prismaMock.agendaEvent.findFirst.mockResolvedValue(baseEvent);

      await service.findOne(institutionId, 'event-1', userId);

      const findFirstArgs = prismaMock.agendaEvent.findFirst.mock.calls[0][0] as {
        where: { OR: Array<Record<string, unknown>> };
      };
      expect(findFirstArgs.where.OR).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update mutable fields and audit the change', async () => {
      prismaMock.agendaEvent.findFirst.mockResolvedValue(baseEvent);
      const updated = {
        ...baseEvent,
        title: 'Reunion de padres (confirmada)',
        location: 'Aula Magna',
      };
      prismaMock.agendaEvent.update.mockResolvedValue(updated);

      const result = await service.update(
        institutionId,
        'event-1',
        { title: 'Reunion de padres (confirmada)', location: 'Aula Magna' },
        userId,
      );

      expect(prismaMock.agendaEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: expect.objectContaining({
          title: 'Reunion de padres (confirmada)',
          location: 'Aula Magna',
        }),
      });
      expect(result.title).toBe('Reunion de padres (confirmada)');
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'EVENT_UPDATED',
          entityType: 'AgendaEvent',
          entityId: 'event-1',
          oldValues: expect.objectContaining({ title: 'Reunion de padres' }),
          newValues: expect.objectContaining({ title: 'Reunion de padres (confirmada)' }),
        }),
      );
    });

    it('should reject updating a cancelled event', async () => {
      prismaMock.agendaEvent.findFirst.mockResolvedValue({
        ...baseEvent,
        status: AgendaEventStatus.CANCELLED,
      });

      await expect(
        service.update(institutionId, 'event-1', { title: 'X' }, userId),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.agendaEvent.update).not.toHaveBeenCalled();
    });

    it('should reject when a provided startAt falls after the existing endAt', async () => {
      prismaMock.agendaEvent.findFirst.mockResolvedValue(baseEvent);

      await expect(
        service.update(
          institutionId,
          'event-1',
          { startAt: '2026-09-01T18:00:00.000Z' },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when both dates are provided and endAt is not after startAt', async () => {
      prismaMock.agendaEvent.findFirst.mockResolvedValue(baseEvent);

      await expect(
        service.update(
          institutionId,
          'event-1',
          {
            startAt: '2026-09-02T10:00:00.000Z',
            endAt: '2026-09-02T09:00:00.000Z',
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return 404 for a non-existent event', async () => {
      prismaMock.agendaEvent.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'event-1', { title: 'X' }, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('should soft-cancel an active event and audit the cancellation', async () => {
      prismaMock.agendaEvent.findFirst.mockResolvedValue(baseEvent);
      prismaMock.agendaEvent.update.mockResolvedValue({
        ...baseEvent,
        status: AgendaEventStatus.CANCELLED,
      });

      const result = await service.cancel(institutionId, 'event-1', userId, '10.0.0.1');

      expect(prismaMock.agendaEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { status: AgendaEventStatus.CANCELLED },
      });
      expect(result.status).toBe(AgendaEventStatus.CANCELLED);
      expect(auditMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'EVENT_CANCELLED',
          entityType: 'AgendaEvent',
          entityId: 'event-1',
          oldValues: { status: AgendaEventStatus.ACTIVE },
          newValues: { status: AgendaEventStatus.CANCELLED },
          ipAddress: '10.0.0.1',
        }),
      );
    });

    it('should reject cancelling an already cancelled event', async () => {
      prismaMock.agendaEvent.findFirst.mockResolvedValue({
        ...baseEvent,
        status: AgendaEventStatus.CANCELLED,
      });

      await expect(service.cancel(institutionId, 'event-1', userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return 404 for a non-existent event', async () => {
      prismaMock.agendaEvent.findFirst.mockResolvedValue(null);

      await expect(service.cancel(institutionId, 'event-1', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});