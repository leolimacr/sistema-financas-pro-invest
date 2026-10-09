import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getConsecutiveDays, getStreakMilestoneMessage } from '../streakUtils';
import type { Transaction } from '../../types';

describe('streakUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('getConsecutiveDays', () => {
    it('should return 0 for empty transactions array', () => {
      expect(getConsecutiveDays([])).toBe(0);
    });

    it('should return 0 if there are no transactions today', () => {
      const today = new Date('2026-05-27T10:00:00Z');
      vi.setSystemTime(today);
      
      const transactions: Transaction[] = [
        { id: '1', userId: 'u1', date: '2026-05-26', amount: 100, category: 'L', description: 'T', type: 'expense' }
      ];
      
      expect(getConsecutiveDays(transactions)).toBe(0);
    });

    it('should return 1 if there is a transaction today but none yesterday', () => {
      const today = new Date('2026-05-27T10:00:00Z');
      vi.setSystemTime(today);
      
      const transactions: Transaction[] = [
        { id: '1', userId: 'u1', date: '2026-05-27', amount: 100, category: 'L', description: 'T', type: 'expense' },
        { id: '2', userId: 'u1', date: '2026-05-25', amount: 50, category: 'A', description: 'T', type: 'expense' }
      ];
      
      expect(getConsecutiveDays(transactions)).toBe(1);
    });

    it('should return N for N consecutive days including today', () => {
      const today = new Date('2026-05-27T10:00:00Z');
      vi.setSystemTime(today);
      
      const transactions: Transaction[] = [
        { id: '1', userId: 'u1', date: '2026-05-27', amount: 10, category: 'A', description: 'D', type: 'expense' },
        { id: '2', userId: 'u1', date: '2026-05-26', amount: 10, category: 'A', description: 'D', type: 'expense' },
        { id: '3', userId: 'u1', date: '2026-05-25', amount: 10, category: 'A', description: 'D', type: 'expense' },
        { id: '4', userId: 'u1', date: '2026-05-23', amount: 10, category: 'A', description: 'D', type: 'expense' }
      ];
      
      expect(getConsecutiveDays(transactions)).toBe(3);
    });

    it('should handle ISO strings with T correctly', () => {
      const today = new Date('2026-05-27T10:00:00Z');
      vi.setSystemTime(today);
      
      const transactions: Transaction[] = [
        { id: '1', userId: 'u1', date: '2026-05-27T14:30:00.000Z', amount: 10, category: 'A', description: 'D', type: 'expense' },
        { id: '2', userId: 'u1', date: '2026-05-26T09:00:00.000Z', amount: 10, category: 'A', description: 'D', type: 'expense' }
      ];
      
      expect(getConsecutiveDays(transactions)).toBe(2);
    });
  });

  describe('getStreakMilestoneMessage', () => {
    it('should return milestone message for 7 days', () => {
      expect(getStreakMilestoneMessage(7)).toContain('7 dias');
    });

    it('should return milestone message for 14 days', () => {
      expect(getStreakMilestoneMessage(14)).toContain('14 dias');
    });

    it('should return milestone message for 21 days', () => {
      expect(getStreakMilestoneMessage(21)).toContain('21 dias');
    });

    it('should return milestone message for 30 days', () => {
      expect(getStreakMilestoneMessage(30)).toContain('30 dias');
    });

    it('should return encouragement for 1 day', () => {
      expect(getStreakMilestoneMessage(1)).toContain('Registre movimentações');
    });

    it('should return current streak for 5 days', () => {
      expect(getStreakMilestoneMessage(5)).toContain('5 dias seguidos');
    });
  });
});
