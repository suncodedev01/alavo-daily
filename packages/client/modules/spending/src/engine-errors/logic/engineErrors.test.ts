import { EngineCallError } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import { describeEngineError } from './engineErrors';

const keep = (key: string) => key;

describe('describeEngineError', () => {
  it('explains a category that still has transactions', () => {
    const error = new EngineCallError('validation', 'category still has transactions');
    expect(describeEngineError(error, keep)).toContain('vẫn còn giao dịch');
  });

  it('explains a wallet that still has transactions', () => {
    const error = new EngineCallError('validation', 'wallet still has transactions');
    expect(describeEngineError(error, keep)).toContain('Ví này vẫn còn giao dịch');
  });

  it('explains sign and zero rules', () => {
    const zero = new EngineCallError('validation', 'amountVnd must not be zero');
    const sign = new EngineCallError('validation', 'an expense amount must be negative');
    expect(describeEngineError(zero, keep)).toContain('khác 0');
    expect(describeEngineError(sign, keep)).toContain('không khớp');
  });

  it('explains a missing record', () => {
    const error = new EngineCallError('not_found', 'transaction x not found');
    expect(describeEngineError(error, keep)).toContain('Không tìm thấy');
  });

  it('falls back to a generic message for unknown failures', () => {
    expect(describeEngineError(new Error('boom'), keep)).toContain('Có lỗi xảy ra');
    expect(describeEngineError(new EngineCallError('internal', 'weird'), keep)).toContain('Có lỗi xảy ra');
  });

  it('passes the message through the translator', () => {
    const shout = (key: string) => key.toUpperCase();
    expect(describeEngineError(new Error('x'), shout)).toBe('CÓ LỖI XẢY RA. BẠN THỬ LẠI NHÉ.');
  });
});
