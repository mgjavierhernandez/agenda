import { Commitment, CommitmentStatus } from '@prisma/client';

export type CommitmentWithOverdue = Commitment & {
  effectiveStatus: CommitmentStatus;
};

function isDateOnlyOverdue(dueDate: Date): boolean {
  const now = new Date();
  const nowDateOnly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dueDateOnly = new Date(
    Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()),
  );
  return nowDateOnly > dueDateOnly;
}

export function deriveCommitmentStatus(commitment: Commitment): CommitmentStatus {
  if (
    commitment.status === CommitmentStatus.COMPLETED ||
    commitment.status === CommitmentStatus.CANCELLED
  ) {
    return commitment.status;
  }

  if (commitment.dueDate && isDateOnlyOverdue(commitment.dueDate)) {
    return CommitmentStatus.OVERDUE;
  }

  return commitment.status;
}

export function deriveCommitmentStatuses<T extends Commitment>(
  commitments: T[],
): (T & { effectiveStatus: CommitmentStatus })[] {
  return commitments.map((c) => ({
    ...c,
    effectiveStatus: deriveCommitmentStatus(c),
  }));
}
