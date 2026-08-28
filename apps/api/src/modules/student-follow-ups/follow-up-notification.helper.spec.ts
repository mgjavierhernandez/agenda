import { FollowUpConfidentiality } from '@prisma/client';
import {
  sendFollowUpNotification,
  sendCommitmentNotification,
  FollowUpNotificationContext,
} from './follow-up-notification.helper';
import { PrismaService } from '../../common/prisma';

jest.mock('../../common/auth/parent-context', () => ({
  findGuardianUserIds: jest.fn(),
}));

import { findGuardianUserIds } from '../../common/auth/parent-context';

const mockFindGuardianUserIds = findGuardianUserIds as jest.MockedFunction<
  typeof findGuardianUserIds
>;

type PrismaMock = {
  teacherAssignment: { findMany: jest.Mock };
  userInstitution: { findMany: jest.Mock };
  notification: { createMany: jest.Mock };
};

function createPrismaMock(): PrismaMock {
  return {
    teacherAssignment: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    userInstitution: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    notification: {
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

function asPrisma(mock: PrismaMock): PrismaService {
  return mock as unknown as PrismaService;
}

function createCtx(
  overrides: Partial<FollowUpNotificationContext> = {},
): FollowUpNotificationContext {
  return {
    institutionId: 'inst-1',
    followUpId: 'fu-1',
    studentId: 'student-1',
    confidentiality: FollowUpConfidentiality.INTERNAL,
    actorUserId: 'actor-1',
    ...overrides,
  };
}

describe('follow-up-notification.helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindGuardianUserIds.mockResolvedValue([]);
  });

  describe('sendFollowUpNotification', () => {
    it('creates notifications for guardians when confidentiality allows', async () => {
      const prisma = createPrismaMock();
      mockFindGuardianUserIds.mockResolvedValue(['guardian-1', 'guardian-2']);

      await sendFollowUpNotification(asPrisma(prisma), createCtx(), 'CREATED');

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: 'guardian-1',
            type: 'STUDENT_FOLLOW_UP',
            entityType: 'StudentFollowUp',
            entityId: 'fu-1',
          }),
          expect.objectContaining({
            userId: 'guardian-2',
            type: 'STUDENT_FOLLOW_UP',
          }),
        ]),
      });
    });

    it('creates notifications for teachers when confidentiality allows', async () => {
      const prisma = createPrismaMock();
      prisma.teacherAssignment.findMany.mockResolvedValue([
        { teacherUserId: 'teacher-1' },
        { teacherUserId: 'teacher-2' },
      ]);

      await sendFollowUpNotification(asPrisma(prisma), createCtx(), 'ESCALATED');

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'teacher-1' }),
          expect.objectContaining({ userId: 'teacher-2' }),
        ]),
      });
    });

    it('creates notifications for admins when confidentiality allows', async () => {
      const prisma = createPrismaMock();
      prisma.userInstitution.findMany.mockResolvedValue([
        { userId: 'admin-1' },
      ]);

      await sendFollowUpNotification(asPrisma(prisma), createCtx(), 'CLOSED');

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'admin-1' }),
        ]),
      });
    });

    it('excludes actor from recipients (no self-notification)', async () => {
      const prisma = createPrismaMock();
      mockFindGuardianUserIds.mockResolvedValue(['actor-1', 'guardian-1']);

      await sendFollowUpNotification(asPrisma(prisma), createCtx({ actorUserId: 'actor-1' }), 'CREATED');

      const call = prisma.notification.createMany.mock.calls[0][0] as { data: Array<{ userId: string }> };
      const recipients = call.data.map((n) => n.userId);
      expect(recipients).not.toContain('actor-1');
      expect(recipients).toContain('guardian-1');
    });

    it('does not create notifications when no recipients available', async () => {
      const prisma = createPrismaMock();
      mockFindGuardianUserIds.mockResolvedValue([]);

      await sendFollowUpNotification(asPrisma(prisma), createCtx(), 'CREATED');

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('does not notify parents for CONFIDENTIAL follow-ups', async () => {
      const prisma = createPrismaMock();
      mockFindGuardianUserIds.mockResolvedValue(['guardian-1']);

      await sendFollowUpNotification(
        asPrisma(prisma),
        createCtx({ confidentiality: FollowUpConfidentiality.CONFIDENTIAL }),
        'CREATED',
      );

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('does not notify parents for SENSITIVE follow-ups', async () => {
      const prisma = createPrismaMock();
      mockFindGuardianUserIds.mockResolvedValue(['guardian-1']);

      await sendFollowUpNotification(
        asPrisma(prisma),
        createCtx({ confidentiality: FollowUpConfidentiality.SENSITIVE }),
        'CREATED',
      );

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('does not notify teachers for CONFIDENTIAL follow-ups', async () => {
      const prisma = createPrismaMock();
      prisma.teacherAssignment.findMany.mockResolvedValue([
        { teacherUserId: 'teacher-1' },
      ]);

      await sendFollowUpNotification(
        asPrisma(prisma),
        createCtx({ confidentiality: FollowUpConfidentiality.CONFIDENTIAL }),
        'CREATED',
      );

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('notifies admins for CONFIDENTIAL follow-ups', async () => {
      const prisma = createPrismaMock();
      prisma.userInstitution.findMany.mockResolvedValue([
        { userId: 'admin-1' },
      ]);

      await sendFollowUpNotification(
        asPrisma(prisma),
        createCtx({ confidentiality: FollowUpConfidentiality.CONFIDENTIAL }),
        'CREATED',
      );

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'admin-1' }),
        ]),
      });
    });

    it('notifies admins for SENSITIVE follow-ups', async () => {
      const prisma = createPrismaMock();
      prisma.userInstitution.findMany.mockResolvedValue([
        { userId: 'admin-1' },
      ]);

      await sendFollowUpNotification(
        asPrisma(prisma),
        createCtx({ confidentiality: FollowUpConfidentiality.SENSITIVE }),
        'RESOLVED',
      );

      expect(prisma.notification.createMany).toHaveBeenCalled();
    });

    it('uses generic message for CONFIDENTIAL follow-ups', async () => {
      const prisma = createPrismaMock();
      prisma.userInstitution.findMany.mockResolvedValue([
        { userId: 'admin-1' },
      ]);

      await sendFollowUpNotification(
        asPrisma(prisma),
        createCtx({ confidentiality: FollowUpConfidentiality.CONFIDENTIAL }),
        'CREATED',
      );

      const call = prisma.notification.createMany.mock.calls[0][0] as { data: Array<{ title: string; message: string }> };
      expect(call.data[0].title).toBe('Nuevo seguimiento del alumno');
      expect(call.data[0].message).toContain('actualización');
    });

    it('does not send cross-tenant notifications', async () => {
      const prisma = createPrismaMock();
      mockFindGuardianUserIds.mockResolvedValue([]);

      await sendFollowUpNotification(
        asPrisma(prisma),
        createCtx({ institutionId: 'tenant-a' }),
        'CREATED',
      );

      expect(mockFindGuardianUserIds).toHaveBeenCalledWith(
        prisma,
        'tenant-a',
        ['student-1'],
      );
    });

    it('sends notifications for all action types', async () => {
      const prisma = createPrismaMock();
      prisma.userInstitution.findMany.mockResolvedValue([
        { userId: 'admin-1' },
      ]);

      const actions = [
        'CREATED',
        'ESCALATED',
        'FOLLOW_UP',
        'RESOLVED',
        'REOPENED',
        'CLOSED',
        'ENTRY_CREATED',
        'COMMITMENT_CREATED',
        'COMMITMENT_COMPLETED',
        'COMMITMENT_UPDATED',
        'ATTACHMENT_ADDED',
      ];

      for (const action of actions) {
        jest.clearAllMocks();
        prisma.userInstitution.findMany.mockResolvedValue([
          { userId: 'admin-1' },
        ]);

        await sendFollowUpNotification(asPrisma(prisma), createCtx(), action);

        expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('sendCommitmentNotification', () => {
    it('notifies the responsible user', async () => {
      const prisma = createPrismaMock();

      await sendCommitmentNotification(
        asPrisma(prisma),
        createCtx(),
        'COMMITMENT_CREATED',
        'responsible-1',
      );

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: 'responsible-1',
            type: 'COMMITMENT_UPDATE',
            entityType: 'Commitment',
          }),
        ]),
      });
    });

    it('notifies guardians for commitment when confidentiality allows', async () => {
      const prisma = createPrismaMock();
      mockFindGuardianUserIds.mockResolvedValue(['guardian-1']);

      await sendCommitmentNotification(
        asPrisma(prisma),
        createCtx(),
        'COMMITMENT_CREATED',
        'responsible-1',
      );

      const call = prisma.notification.createMany.mock.calls[0][0] as { data: Array<{ userId: string }> };
      const recipients = call.data.map((n) => n.userId);
      expect(recipients).toContain('responsible-1');
      expect(recipients).toContain('guardian-1');
    });

    it('does not notify guardians for CONFIDENTIAL commitments', async () => {
      const prisma = createPrismaMock();
      mockFindGuardianUserIds.mockResolvedValue(['guardian-1']);

      await sendCommitmentNotification(
        asPrisma(prisma),
        createCtx({ confidentiality: FollowUpConfidentiality.CONFIDENTIAL }),
        'COMMITMENT_CREATED',
        'responsible-1',
      );

      const call = prisma.notification.createMany.mock.calls[0][0] as { data: Array<{ userId: string }> };
      const recipients = call.data.map((n) => n.userId);
      expect(recipients).toContain('responsible-1');
      expect(recipients).not.toContain('guardian-1');
    });

    it('excludes actor from recipients', async () => {
      const prisma = createPrismaMock();
      mockFindGuardianUserIds.mockResolvedValue(['actor-1']);

      await sendCommitmentNotification(
        asPrisma(prisma),
        createCtx({ actorUserId: 'actor-1' }),
        'COMMITMENT_CREATED',
        'responsible-1',
      );

      const call = prisma.notification.createMany.mock.calls[0][0] as { data: Array<{ userId: string }> };
      const recipients = call.data.map((n) => n.userId);
      expect(recipients).not.toContain('actor-1');
      expect(recipients).toContain('responsible-1');
    });

    it('does not create notifications when actor is the only recipient', async () => {
      const prisma = createPrismaMock();

      await sendCommitmentNotification(
        asPrisma(prisma),
        createCtx({ actorUserId: 'responsible-1' }),
        'COMMITMENT_CREATED',
        'responsible-1',
      );

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('does not notify parents for SENSITIVE commitments', async () => {
      const prisma = createPrismaMock();
      mockFindGuardianUserIds.mockResolvedValue(['guardian-1']);

      await sendCommitmentNotification(
        asPrisma(prisma),
        createCtx({ confidentiality: FollowUpConfidentiality.SENSITIVE }),
        'COMMITMENT_CREATED',
        'responsible-1',
      );

      const call = prisma.notification.createMany.mock.calls[0][0] as { data: Array<{ userId: string }> };
      const recipients = call.data.map((n) => n.userId);
      expect(recipients).not.toContain('guardian-1');
    });
  });
});
