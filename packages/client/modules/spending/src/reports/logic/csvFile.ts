import type { DateRange } from '../types';

const BYTE_ORDER_MARK = '﻿';

/** Excel only reads Vietnamese letters in a CSV file when it starts with a byte order mark. */
export function withByteOrderMark(csv: string): string {
  return `${BYTE_ORDER_MARK}${csv}`;
}

export function csvFilename(range: DateRange): string {
  return `alavo-giao-dich-${range.from}_${range.to}.csv`;
}
