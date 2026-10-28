import { describe, expect, it } from 'vitest';
import {
  compareBillPeriods,
  createBillComparison,
  deserializeBillComparison,
  isMonth,
  serializeBillComparison,
  transitionBillComparison,
  updateBillComparison,
  validateBillComparisonInput,
  type BillComparisonInput,
  type BillComparisonRecord,
} from './bill-comparison';

const now = '2026-10-28T10:00:00.000Z';
const next = '2026-10-28T10:01:00.000Z';
const validInput: BillComparisonInput = {
  previousMonth: '2026-08',
  previousUsageKwh: '200',
  currentMonth: '2026-09',
  currentUsageKwh: '210',
};

function createRecord(input = validInput): BillComparisonRecord {
  const result = createBillComparison(input, { id: 'local-comparison-1', now });
  if (!result.ok) throw new Error('expected valid comparison');
  return result.value;
}

describe('monthly bill comparison domain', () => {
  it('creates a typed local draft with exactly two observed kWh periods', () => {
    const record = createRecord();
    expect(record.status).toBe('draft');
    expect(record.periods).toEqual([
      { month: '2026-08', usageKwh: 200 },
      { month: '2026-09', usageKwh: 210 },
    ]);
    expect(record).not.toHaveProperty('provider');
    expect(record).not.toHaveProperty('tariff');
    expect(record).not.toHaveProperty('estimatedCause');
    expect(record).not.toHaveProperty('amount');
  });

  it('validates month order and non-negative kWh precision and bounds', () => {
    expect(isMonth('1900-01')).toBe(true);
    expect(isMonth('2199-12')).toBe(true);
    expect(isMonth('1899-12')).toBe(false);
    expect(isMonth('2200-01')).toBe(false);
    expect(validateBillComparisonInput(validInput)).toEqual([]);
    expect(validateBillComparisonInput({ ...validInput, currentMonth: '2026-08' }).map((error) => error.field)).toContain('currentMonth');
    expect(validateBillComparisonInput({ ...validInput, currentMonth: '2026-07' }).map((error) => error.field)).toContain('currentMonth');
    expect(validateBillComparisonInput({ ...validInput, previousMonth: '2026-13' }).map((error) => error.field)).toContain('previousMonth');
    for (const value of ['-1', '+2', '1e3', '1,000', '1.2345', '1000000.001', '']) {
      expect(validateBillComparisonInput({ ...validInput, previousUsageKwh: value }).map((error) => error.field)).toContain('previousUsageKwh');
    }
    expect(validateBillComparisonInput({ ...validInput, previousUsageKwh: '0', currentUsageKwh: '0.001' })).toEqual([]);
    expect(() => validateBillComparisonInput({ ...validInput, previousUsageKwh: undefined as unknown as string })).not.toThrow();
    expect(validateBillComparisonInput({ ...validInput, previousUsageKwh: undefined as unknown as string }).map((error) => error.field)).toContain('previousUsageKwh');
  });

  it('reports the observed difference and percentage without estimating a cause', () => {
    const record = createRecord();
    expect(compareBillPeriods(record)).toEqual({
      previousKwh: 200,
      currentKwh: 210,
      differenceKwh: 10,
      percentageChange: 5,
    });
    expect(compareBillPeriods(createRecord({ ...validInput, previousUsageKwh: '0', currentUsageKwh: '3' })).percentageChange).toBeNull();
  });

  it('updates a draft in chronological order and prevents edits while reviewed', () => {
    const record = createRecord();
    const changed = updateBillComparison(record, { ...validInput, currentUsageKwh: '212.5' }, next);
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;
    expect(changed.value.periods[1]?.usageKwh).toBe(212.5);
    expect(updateBillComparison(changed.value, validInput, now).ok).toBe(false);
    const reviewed = transitionBillComparison(changed.value, 'reviewed', next);
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(updateBillComparison(reviewed.value, validInput, next).ok).toBe(false);
    const reopened = transitionBillComparison(reviewed.value, 'draft', '2026-10-28T10:02:00.000Z');
    expect(reopened.ok).toBe(true);
    if (reopened.ok) expect(reopened.value.reviewedAt).toBeNull();
    expect(updateBillComparison({ status: 'draft' } as BillComparisonRecord, validInput, next).ok).toBe(false);
    expect(transitionBillComparison({ status: 'unknown' } as unknown as BillComparisonRecord, 'draft', next).ok).toBe(false);
  });

  it('round-trips serialization and rejects malformed order, timestamps and invented fields', () => {
    const record = createRecord();
    expect(deserializeBillComparison(serializeBillComparison(record))).toEqual(record);
    expect(() => deserializeBillComparison('{')).toThrow('Invalid bill comparison JSON');
    expect(() => deserializeBillComparison('{"id":"unknown"}')).toThrow('Invalid bill comparison record');
    const reversed = { ...record, periods: [...record.periods].reverse() as typeof record.periods };
    expect(() => serializeBillComparison(reversed)).toThrow('Invalid bill comparison record');
    const inventedCause = { ...record, estimatedCause: 'weather' };
    expect(() => serializeBillComparison(inventedCause)).toThrow('Invalid bill comparison record');
    const malformedReview = { ...record, status: 'reviewed' as const, reviewedAt: next };
    expect(() => serializeBillComparison(malformedReview)).toThrow('Invalid bill comparison record');
  });
});
