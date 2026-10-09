import { describe, expect, it } from 'vitest';

import { createDemoData } from '../../testing/fixtures';
import { appendDigits, applyKeypadKey, draftFromTransaction, newDraft, normalizeAmount, removeLastDigit, signedAmount, toNewTransaction, toUpdateTransaction, validateDraft, withKind } from './transactionForm';

const { categories, wallets, transactions } = createDemoData();
const TODAY = '2026-10-09';

function draftWith(changes: Partial<ReturnType<typeof newDraft>>) {
  return { ...newDraft(TODAY, categories, wallets), ...changes };
}

describe('newDraft', () => {
  it('starts as an expense in the first expense category, first wallet, today', () => {
    expect(newDraft(TODAY, categories, wallets)).toEqual({
      kind: 'expense',
      amount: '',
      categoryId: 'category-food',
      title: '',
      walletId: 'wallet-tcb',
      occurredOn: TODAY,
      recurring: false,
    });
  });
});

describe('amount typing', () => {
  it('formats digits with thousands separators while typing', () => {
    expect(normalizeAmount('1250000')).toBe('1.250.000');
    expect(normalizeAmount('abc')).toBe('');
  });

  it('drops leading zeros and caps the length', () => {
    expect(normalizeAmount('00012')).toBe('12');
    expect(normalizeAmount('1234567890123456')).toBe('123.456.789.012');
  });

  it('appends keypad digits including the triple zero', () => {
    expect(appendDigits('12', '000')).toBe('12.000');
    expect(appendDigits('', '0')).toBe('');
  });

  it('removes the last digit and handles delete on an empty amount', () => {
    expect(removeLastDigit('12.345')).toBe('1.234');
    expect(removeLastDigit('')).toBe('');
    expect(applyKeypadKey('12', 'delete')).toBe('1');
    expect(applyKeypadKey('1', '5')).toBe('15');
  });
});

describe('withKind', () => {
  it('switches the category to the first one of the new kind', () => {
    const switched = withKind(draftWith({ categoryId: 'category-bills' }), 'income', categories);
    expect(switched.kind).toBe('income');
    expect(switched.categoryId).toBe('category-income');
  });

  it('leaves the draft alone when the kind does not change', () => {
    const draft = draftWith({ categoryId: 'category-bills' });
    expect(withKind(draft, 'expense', categories)).toBe(draft);
  });
});

describe('validateDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateDraft(draftWith({ amount: '65.000' }))).toEqual({});
  });

  it('asks for an amount above zero', () => {
    expect(validateDraft(draftWith({ amount: '' })).amount).toBeDefined();
  });

  it('asks for a category and a wallet', () => {
    const errors = validateDraft(draftWith({ amount: '1', categoryId: '', walletId: '' }));
    expect(errors.category).toBeDefined();
    expect(errors.wallet).toBeDefined();
  });

  it('rejects an impossible date', () => {
    expect(validateDraft(draftWith({ amount: '1', occurredOn: '2026-02-30' })).date).toBeDefined();
  });
});

describe('sign rules', () => {
  it('makes expenses negative and income positive', () => {
    expect(signedAmount(draftWith({ kind: 'expense', amount: '65.000' }))).toBe(-65_000);
    expect(signedAmount(draftWith({ kind: 'income', amount: '65.000' }))).toBe(65_000);
  });
});

describe('payloads', () => {
  it('uses the category name when the note is empty', () => {
    const payload = toNewTransaction(draftWith({ amount: '65.000' }), 'Ăn uống');
    expect(payload.title).toBe('Ăn uống');
    expect(payload.recurringRule).toBeNull();
  });

  it('trims the note and writes a monthly rule on the chosen day', () => {
    const payload = toNewTransaction(
      draftWith({ amount: '1.000', title: '  Netflix ', recurring: true, occurredOn: '2026-10-08' }),
      'Giải trí',
    );
    expect(payload.title).toBe('Netflix');
    expect(payload.recurringRule).toBe('monthly:8');
  });

  it('carries the id for an update', () => {
    expect(toUpdateTransaction('tx-1', draftWith({ amount: '5' }), 'Ăn uống').id).toBe('tx-1');
  });
});

describe('draftFromTransaction', () => {
  it('shows spending as a positive amount of kind expense', () => {
    const rent = transactions.find((item) => item.title === 'Tiền thuê nhà');
    expect(draftFromTransaction(rent!, categories)).toMatchObject({
      kind: 'expense',
      amount: '7.500.000',
      recurring: true,
    });
  });

  it('shows income with kind income', () => {
    const salary = transactions.find((item) => item.title === 'Lương tháng 10');
    expect(draftFromTransaction(salary!, categories).kind).toBe('income');
  });
});
