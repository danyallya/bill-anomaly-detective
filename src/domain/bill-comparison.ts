export type BillComparisonField =
  | 'id'
  | 'previousMonth'
  | 'previousUsageKwh'
  | 'currentMonth'
  | 'currentUsageKwh'
  | 'status'
  | 'updatedAt';

export type BillComparisonInput = {
  previousMonth: string;
  previousUsageKwh: string;
  currentMonth: string;
  currentUsageKwh: string;
};

export type BillPeriod = {
  month: string;
  usageKwh: number;
};

export type BillComparisonStatus = 'draft' | 'reviewed';

export type BillComparisonRecord = {
  schemaVersion: 1;
  id: string;
  status: BillComparisonStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  periods: [BillPeriod, BillPeriod];
};

export type BillComparisonError = {
  field: BillComparisonField;
  message: string;
};

export type BillComparisonResult =
  | { ok: true; value: BillComparisonRecord }
  | { ok: false; errors: BillComparisonError[] };

export type BillUsageDifference = {
  previousKwh: number;
  currentKwh: number;
  differenceKwh: number;
  percentageChange: number | null;
};

const allowedTransitions: Record<BillComparisonStatus, readonly BillComparisonStatus[]> = {
  draft: ['reviewed'],
  reviewed: ['draft'],
};

function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function exactKeys(value: object, expected: string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

export function isMonth(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  return year >= 1900 && year <= 2199;
}

function parseUsage(value: string): number | null {
  if (typeof value !== 'string') return null;
  if (!/^\d+(?:\.\d{1,3})?$/.test(value.trim())) return null;
  const usageKwh = Number(value);
  if (
    !Number.isFinite(usageKwh) ||
    usageKwh < 0 ||
    usageKwh > 1_000_000 ||
    Math.abs(usageKwh * 1000 - Math.round(usageKwh * 1000)) > 1e-7
  ) {
    return null;
  }
  return usageKwh;
}

export function validateBillComparisonInput(input: BillComparisonInput): BillComparisonError[] {
  const errors: BillComparisonError[] = [];
  const previousMonthValid = isMonth(input.previousMonth);
  const currentMonthValid = isMonth(input.currentMonth);

  if (!previousMonthValid) {
    errors.push({ field: 'previousMonth', message: 'Enter a valid previous billing month.' });
  }
  if (!currentMonthValid) {
    errors.push({ field: 'currentMonth', message: 'Enter a valid current billing month.' });
  }
  if (previousMonthValid && currentMonthValid && input.currentMonth <= input.previousMonth) {
    errors.push({ field: 'currentMonth', message: 'The current billing month must follow the previous month.' });
  }
  if (parseUsage(input.previousUsageKwh) === null) {
    errors.push({ field: 'previousUsageKwh', message: 'Enter a non-negative kWh value up to 1,000,000 with at most 3 decimals.' });
  }
  if (parseUsage(input.currentUsageKwh) === null) {
    errors.push({ field: 'currentUsageKwh', message: 'Enter a non-negative kWh value up to 1,000,000 with at most 3 decimals.' });
  }
  return errors;
}

function periodsFromInput(input: BillComparisonInput): [BillPeriod, BillPeriod] {
  return [
    { month: input.previousMonth, usageKwh: parseUsage(input.previousUsageKwh) ?? 0 },
    { month: input.currentMonth, usageKwh: parseUsage(input.currentUsageKwh) ?? 0 },
  ];
}

export function createBillComparison(
  input: BillComparisonInput,
  options: { id: string; now: string },
): BillComparisonResult {
  const errors = validateBillComparisonInput(input);
  if (typeof options.id !== 'string' || !options.id.trim() || options.id.length > 100) {
    errors.push({ field: 'id', message: 'A local comparison ID of 1–100 characters is required.' });
  }
  if (!isTimestamp(options.now)) {
    errors.push({ field: 'updatedAt', message: 'The record time must be a valid ISO timestamp.' });
  }
  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      id: options.id,
      status: 'draft',
      createdAt: options.now,
      updatedAt: options.now,
      reviewedAt: null,
      periods: periodsFromInput(input),
    },
  };
}

export function updateBillComparison(
  record: BillComparisonRecord,
  input: BillComparisonInput,
  at: string,
): BillComparisonResult {
  const errors = validateBillComparisonInput(input);
  const recordIsValid = isBillComparisonRecord(record);
  if (!recordIsValid) {
    errors.push({ field: 'status', message: 'The saved comparison is invalid.' });
  } else if (record.status !== 'draft') {
    errors.push({ field: 'status', message: 'Reopen the reviewed comparison before editing it.' });
  }
  if (!isTimestamp(at) || (recordIsValid && at < record.updatedAt)) {
    errors.push({ field: 'updatedAt', message: 'Comparison changes must use valid chronological times.' });
  }
  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      ...record,
      updatedAt: at,
      periods: periodsFromInput(input),
    },
  };
}

export function transitionBillComparison(
  record: BillComparisonRecord,
  nextStatus: BillComparisonStatus,
  at: string,
): BillComparisonResult {
  const errors: BillComparisonError[] = [];
  const recordIsValid = isBillComparisonRecord(record);
  if (!recordIsValid) {
    errors.push({ field: 'status', message: 'The saved comparison is invalid.' });
  } else if (!allowedTransitions[record.status].includes(nextStatus)) {
    errors.push({ field: 'status', message: `Cannot move a ${record.status} comparison to ${nextStatus}.` });
  }
  if (!isTimestamp(at) || (recordIsValid && at < record.updatedAt)) {
    errors.push({ field: 'updatedAt', message: 'Comparison changes must use valid chronological times.' });
  }
  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      ...record,
      status: nextStatus,
      updatedAt: at,
      reviewedAt: nextStatus === 'reviewed' ? at : null,
    },
  };
}

export function isBillComparisonRecord(value: unknown): value is BillComparisonRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<BillComparisonRecord>;
  if (
    !exactKeys(value, ['schemaVersion', 'id', 'status', 'createdAt', 'updatedAt', 'reviewedAt', 'periods']) ||
    record.schemaVersion !== 1 ||
    typeof record.id !== 'string' ||
    !record.id.trim() ||
    record.id.length > 100 ||
    !['draft', 'reviewed'].includes(record.status ?? '') ||
    !isTimestamp(record.createdAt) ||
    !isTimestamp(record.updatedAt) ||
    Date.parse(record.createdAt) > Date.parse(record.updatedAt) ||
    !Array.isArray(record.periods) ||
    record.periods.length !== 2
  ) {
    return false;
  }

  const [previous, current] = record.periods as BillPeriod[];
  if (
    !previous || !current ||
    !exactKeys(previous, ['month', 'usageKwh']) ||
    !exactKeys(current, ['month', 'usageKwh']) ||
    !isMonth(previous.month) ||
    !isMonth(current.month) ||
    current.month <= previous.month ||
    !isUsageNumber(previous.usageKwh) ||
    !isUsageNumber(current.usageKwh)
  ) {
    return false;
  }

  if (record.status === 'draft') return record.reviewedAt === null;
  return isTimestamp(record.reviewedAt) && record.reviewedAt === record.updatedAt;
}

function isUsageNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000 && Math.abs(value * 1000 - Math.round(value * 1000)) <= 1e-7;
}

export function compareBillPeriods(record: BillComparisonRecord): BillUsageDifference {
  if (!isBillComparisonRecord(record)) throw new Error('Invalid bill comparison record.');
  const previousKwh = record.periods[0].usageKwh;
  const currentKwh = record.periods[1].usageKwh;
  const differenceKwh = currentKwh - previousKwh;
  return {
    previousKwh,
    currentKwh,
    differenceKwh,
    percentageChange: previousKwh === 0 ? null : (differenceKwh / previousKwh) * 100,
  };
}

export function serializeBillComparison(record: BillComparisonRecord): string {
  if (!isBillComparisonRecord(record)) throw new Error('Invalid bill comparison record.');
  return JSON.stringify(record);
}

export function deserializeBillComparison(value: string): BillComparisonRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Invalid bill comparison JSON.');
  }
  if (!isBillComparisonRecord(parsed)) throw new Error('Invalid bill comparison record.');
  return parsed;
}
