import { PrismaService } from '../../common/prisma';
import { findGuardianUserIds } from '../../common/auth/parent-context';
import {
  FollowUpConfidentiality,
  NotificationType,
} from '@prisma/client';

const CONFIDENTIALITY_NOTIFY_LEVELS: Record<
  string,
  FollowUpConfidentiality[]
> = {
  INSTITUTION_ADMIN: [
    FollowUpConfidentiality.PUBLIC,
    FollowUpConfidentiality.INTERNAL,
    FollowUpConfidentiality.CONFIDENTIAL,
    FollowUpConfidentiality.SENSITIVE,
  ],
  TEACHER: [FollowUpConfidentiality.PUBLIC, FollowUpConfidentiality.INTERNAL],
  PARENT: [FollowUpConfidentiality.PUBLIC, FollowUpConfidentiality.INTERNAL],
  STUDENT: [FollowUpConfidentiality.PUBLIC, FollowUpConfidentiality.INTERNAL],
};

export interface FollowUpNotificationContext {
  institutionId: string;
  followUpId: string;
  studentId: string;
  confidentiality: FollowUpConfidentiality;
  actorUserId: string;
}

function canNotifyForConfidentiality(
  role: string,
  confidentiality: FollowUpConfidentiality,
): boolean {
  const allowed = CONFIDENTIALITY_NOTIFY_LEVELS[role];
  if (!allowed) return false;
  return allowed.includes(confidentiality);
}

function buildNotificationTitle(
  action: string,
  confidentiality: FollowUpConfidentiality,
): string {
  if (
    confidentiality === FollowUpConfidentiality.CONFIDENTIAL ||
    confidentiality === FollowUpConfidentiality.SENSITIVE
  ) {
    return 'Nuevo seguimiento del alumno';
  }

  switch (action) {
    case 'CREATED':
      return 'Nuevo seguimiento del alumno';
    case 'ESCALATED':
      return 'Seguimiento escalado';
    case 'FOLLOW_UP':
      return 'Seguimiento en progreso';
    case 'RESOLVED':
      return 'Seguimiento resuelto';
    case 'REOPENED':
      return 'Seguimiento reabierto';
    case 'CLOSED':
      return 'Seguimiento cerrado';
    case 'ENTRY_CREATED':
      return 'Nueva entrada en seguimiento';
    case 'COMMITMENT_CREATED':
      return 'Nuevo compromiso en seguimiento';
    case 'COMMITMENT_COMPLETED':
      return 'Compromiso completado';
    case 'COMMITMENT_UPDATED':
      return 'Compromiso actualizado';
    case 'ATTACHMENT_ADDED':
      return 'Archivo adjunto en seguimiento';
    default:
      return 'Actualización en seguimiento del alumno';
  }
}

function buildNotificationMessage(
  action: string,
  confidentiality: FollowUpConfidentiality,
): string {
  if (
    confidentiality === FollowUpConfidentiality.CONFIDENTIAL ||
    confidentiality === FollowUpConfidentiality.SENSITIVE
  ) {
    return 'Se ha realizado una actualización en un seguimiento del alumno.';
  }

  switch (action) {
    case 'CREATED':
      return 'Se ha creado un nuevo seguimiento del alumno.';
    case 'ESCALATED':
      return 'Un seguimiento del alumno ha sido escalado.';
    case 'FOLLOW_UP':
      return 'Un seguimiento del alumno está en progreso.';
    case 'RESOLVED':
      return 'Un seguimiento del alumno ha sido resuelto.';
    case 'REOPENED':
      return 'Un seguimiento del alumno ha sido reabierto.';
    case 'CLOSED':
      return 'Un seguimiento del alumno ha sido cerrado.';
    case 'ENTRY_CREATED':
      return 'Se ha agregado una nueva entrada al seguimiento.';
    case 'COMMITMENT_CREATED':
      return 'Se ha creado un nuevo compromiso en el seguimiento.';
    case 'COMMITMENT_COMPLETED':
      return 'Un compromiso en el seguimiento ha sido completado.';
    case 'COMMITMENT_UPDATED':
      return 'Un compromiso en el seguimiento ha sido actualizado.';
    case 'ATTACHMENT_ADDED':
      return 'Se ha adjuntado un archivo al seguimiento.';
    default:
      return 'Se ha realizado una actualización en un seguimiento del alumno.';
  }
}

async function resolveTeacherUserIds(
  prisma: PrismaService,
  institutionId: string,
  studentId: string,
): Promise<string[]> {
  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      institutionId,
      status: 'ACTIVE',
      course: {
        enrollments: {
          some: {
            studentId,
            status: 'ACTIVE',
          },
        },
      },
    },
    select: { teacherUserId: true },
  });

  return [...new Set(assignments.map((a) => a.teacherUserId))];
}

async function resolveAdminUserIds(
  prisma: PrismaService,
  institutionId: string,
): Promise<string[]> {
  const admins = await prisma.userInstitution.findMany({
    where: {
      institutionId,
      status: 'ACTIVE',
      roles: {
        some: {
          role: { name: 'INSTITUTION_ADMIN' },
        },
      },
    },
    select: { userId: true },
  });

  return [...new Set(admins.map((a) => a.userId))];
}

async function resolveFollowUpRecipients(
  prisma: PrismaService,
  institutionId: string,
  studentId: string,
  confidentiality: FollowUpConfidentiality,
  actorUserId: string,
): Promise<string[]> {
  const recipientSet = new Set<string>();

  if (canNotifyForConfidentiality('INSTITUTION_ADMIN', confidentiality)) {
    const adminIds = await resolveAdminUserIds(prisma, institutionId);
    for (const id of adminIds) recipientSet.add(id);
  }

  if (canNotifyForConfidentiality('TEACHER', confidentiality)) {
    const teacherIds = await resolveTeacherUserIds(
      prisma,
      institutionId,
      studentId,
    );
    for (const id of teacherIds) recipientSet.add(id);
  }

  if (canNotifyForConfidentiality('PARENT', confidentiality)) {
    const guardianIds = await findGuardianUserIds(prisma, institutionId, [
      studentId,
    ]);
    for (const id of guardianIds) recipientSet.add(id);
  }

  recipientSet.delete(actorUserId);

  return [...recipientSet];
}

export async function sendFollowUpNotification(
  prisma: PrismaService,
  ctx: FollowUpNotificationContext,
  action: string,
): Promise<void> {
  const recipientIds = await resolveFollowUpRecipients(
    prisma,
    ctx.institutionId,
    ctx.studentId,
    ctx.confidentiality,
    ctx.actorUserId,
  );

  if (recipientIds.length === 0) return;

  const title = buildNotificationTitle(action, ctx.confidentiality);
  const message = buildNotificationMessage(action, ctx.confidentiality);

  const notifications = recipientIds.map((userId) => ({
    institutionId: ctx.institutionId,
    userId,
    type: NotificationType.STUDENT_FOLLOW_UP as NotificationType,
    title,
    message,
    entityType: 'StudentFollowUp',
    entityId: ctx.followUpId,
  }));

  await prisma.notification.createMany({ data: notifications });
}

export async function sendCommitmentNotification(
  prisma: PrismaService,
  ctx: FollowUpNotificationContext,
  action: string,
  responsibleUserId: string,
): Promise<void> {
  const title = buildNotificationTitle(action, ctx.confidentiality);
  const message = buildNotificationMessage(action, ctx.confidentiality);

  const recipientIds = new Set<string>();

  recipientIds.add(responsibleUserId);

  if (canNotifyForConfidentiality('PARENT', ctx.confidentiality)) {
    const guardianIds = await findGuardianUserIds(prisma, ctx.institutionId, [
      ctx.studentId,
    ]);
    for (const id of guardianIds) recipientIds.add(id);
  }

  recipientIds.delete(ctx.actorUserId);

  if (recipientIds.size === 0) return;

  const notifications = [...recipientIds].map((userId) => ({
    institutionId: ctx.institutionId,
    userId,
    type: NotificationType.COMMITMENT_UPDATE as NotificationType,
    title,
    message,
    entityType: 'Commitment',
    entityId: ctx.followUpId,
  }));

  await prisma.notification.createMany({ data: notifications });
}
