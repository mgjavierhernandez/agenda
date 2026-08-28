import { CommitmentStatus } from '@prisma/client';
import {
  deriveCommitmentStatus,
  deriveCommitmentStatuses,
} from './commitment-overdue.helper';

function makeCommitment(overrides: {
  status?: CommitmentStatus;
  dueDate?: Date | null;
} = {}) {
  return {
    id: 'c1',
    followUpId: 'fu1',
    responsibleUserId: 'u1',
    responsibleRole: 'TEACHER' as const,
    description: 'Test commitment',
    status: overrides.status ?? CommitmentStatus.PENDING,
    dueDate: overrides.dueDate !== undefined ? overrides.dueDate : new Date(),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('commitment-overdue.helper', () => {
  describe('deriveCommitmentStatus', () => {
    it('PENDING + future dueDate → PENDING', () => {
      const future = new Date();
      future.setUTCDate(future.getUTCDate() + 7);
      const result = deriveCommitmentStatus(
        makeCommitment({ status: CommitmentStatus.PENDING, dueDate: future }),
      );
      expect(result).toBe(CommitmentStatus.PENDING);
    });

    it('PENDING + past dueDate → OVERDUE', () => {
      const past = new Date();
      past.setUTCDate(past.getUTCDate() - 1);
      const result = deriveCommitmentStatus(
        makeCommitment({ status: CommitmentStatus.PENDING, dueDate: past }),
      );
      expect(result).toBe(CommitmentStatus.OVERDUE);
    });

    it('IN_PROGRESS + future dueDate → IN_PROGRESS', () => {
      const future = new Date();
      future.setUTCDate(future.getUTCDate() + 7);
      const result = deriveCommitmentStatus(
        makeCommitment({
          status: CommitmentStatus.IN_PROGRESS,
          dueDate: future,
        }),
      );
      expect(result).toBe(CommitmentStatus.IN_PROGRESS);
    });

    it('IN_PROGRESS + past dueDate → OVERDUE', () => {
      const past = new Date();
      past.setUTCDate(past.getUTCDate() - 1);
      const result = deriveCommitmentStatus(
        makeCommitment({
          status: CommitmentStatus.IN_PROGRESS,
          dueDate: past,
        }),
      );
      expect(result).toBe(CommitmentStatus.OVERDUE);
    });

    it('COMPLETED + past dueDate → COMPLETED (not OVERDUE)', () => {
      const past = new Date();
      past.setUTCDate(past.getUTCDate() - 7);
      const result = deriveCommitmentStatus(
        makeCommitment({
          status: CommitmentStatus.COMPLETED,
          dueDate: past,
        }),
      );
      expect(result).toBe(CommitmentStatus.COMPLETED);
    });

    it('CANCELLED + past dueDate → CANCELLED (not OVERDUE)', () => {
      const past = new Date();
      past.setUTCDate(past.getUTCDate() - 7);
      const result = deriveCommitmentStatus(
        makeCommitment({
          status: CommitmentStatus.CANCELLED,
          dueDate: past,
        }),
      );
      expect(result).toBe(CommitmentStatus.CANCELLED);
    });

    it('PENDING + no dueDate → PENDING (conserves status)', () => {
      const result = deriveCommitmentStatus(
        makeCommitment({ status: CommitmentStatus.PENDING, dueDate: null }),
      );
      expect(result).toBe(CommitmentStatus.PENDING);
    });

    it('OVERDUE stored status + past dueDate → OVERDUE', () => {
      const past = new Date();
      past.setUTCDate(past.getUTCDate() - 3);
      const result = deriveCommitmentStatus(
        makeCommitment({
          status: CommitmentStatus.OVERDUE,
          dueDate: past,
        }),
      );
      expect(result).toBe(CommitmentStatus.OVERDUE);
    });

    it('PENDING + today (boundary) → PENDING (not overdue on same day)', () => {
      const today = new Date();
      today.setUTCHours(23, 59, 59, 999);
      const result = deriveCommitmentStatus(
        makeCommitment({ status: CommitmentStatus.PENDING, dueDate: today }),
      );
      expect(result).toBe(CommitmentStatus.PENDING);
    });

    it('PENDING + yesterday → OVERDUE', () => {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(23, 59, 59, 999);
      const result = deriveCommitmentStatus(
        makeCommitment({
          status: CommitmentStatus.PENDING,
          dueDate: yesterday,
        }),
      );
      expect(result).toBe(CommitmentStatus.OVERDUE);
    });

    it('uses date-only comparison (ignores time component)', () => {
      const past = new Date();
      past.setUTCDate(past.getUTCDate() - 1);
      past.setUTCHours(0, 0, 0, 0);
      const result = deriveCommitmentStatus(
        makeCommitment({ status: CommitmentStatus.PENDING, dueDate: past }),
      );
      expect(result).toBe(CommitmentStatus.OVERDUE);
    });
  });

  describe('deriveCommitmentStatuses', () => {
    it('derives status for multiple commitments', () => {
      const future = new Date();
      future.setUTCDate(future.getUTCDate() + 7);
      const past = new Date();
      past.setUTCDate(past.getUTCDate() - 1);

      const commitments = [
        makeCommitment({ status: CommitmentStatus.PENDING, dueDate: future }),
        makeCommitment({ status: CommitmentStatus.PENDING, dueDate: past }),
        makeCommitment({
          status: CommitmentStatus.COMPLETED,
          dueDate: past,
        }),
      ];

      const results = deriveCommitmentStatuses(commitments);
      expect(results[0].effectiveStatus).toBe(CommitmentStatus.PENDING);
      expect(results[1].effectiveStatus).toBe(CommitmentStatus.OVERDUE);
      expect(results[2].effectiveStatus).toBe(CommitmentStatus.COMPLETED);
    });

    it('returns empty array for empty input', () => {
      expect(deriveCommitmentStatuses([])).toEqual([]);
    });
  });
});
