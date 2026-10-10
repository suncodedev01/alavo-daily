import type { PaymentMethod, Transaction } from '@alavo-daily/common/engine';
import { EngineCallError } from '@alavo-daily/common/engine';
import type { Handlers } from '@alavo-daily/common/testing';

import type { FakeData } from './fixtures';

const PAYMENT_ICONS = ['money', 'bank', 'device-mobile', 'credit-card', 'coins'];

let counter = 0;

function invalid(message: string): EngineCallError {
  return new EngineCallError('validation', message);
}

function withUsage(data: FakeData, method: PaymentMethod): PaymentMethod {
  const used = data.transactions.filter((item) => item.paymentMethodId === method.id).length;
  return { ...method, transactionCount: used };
}

function checkedName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw invalid('name must not be empty');
  return trimmed;
}

function checkedIcon(icon: string): void {
  if (!PAYMENT_ICONS.includes(icon)) throw invalid(`icon ${icon} is not a payment method icon`);
}

function findMethod(data: FakeData, id: string): PaymentMethod {
  const found = data.paymentMethods.find((item) => item.id === id);
  if (!found) throw new EngineCallError('not_found', `payment method ${id} was not found`);
  return found;
}

function forgetMethod(transactions: Transaction[], id: string): Transaction[] {
  return transactions.map((item) => (item.paymentMethodId === id ? { ...item, paymentMethodId: null } : item));
}

export function defaultPaymentMethods(): PaymentMethod[] {
  return [
    { id: 'payment-cash', name: 'Tiền mặt', icon: 'money', isDefault: true, position: 1, transactionCount: 0 },
    { id: 'payment-bank', name: 'Chuyển khoản', icon: 'bank', isDefault: false, position: 2, transactionCount: 0 },
    { id: 'payment-ewallet', name: 'Ví điện tử', icon: 'device-mobile', isDefault: false, position: 3, transactionCount: 0 },
  ];
}

export function paymentMethodHandlers(data: FakeData): Handlers {
  return {
    'spending.list_payment_methods': () => data.paymentMethods.map((item) => withUsage(data, item)),
    'spending.create_payment_method': (input) => {
      checkedIcon(input.icon);
      counter += 1;
      const created: PaymentMethod = {
        id: `payment-new-${counter}`,
        name: checkedName(input.name),
        icon: input.icon,
        isDefault: false,
        position: data.paymentMethods.length + 1,
        transactionCount: 0,
      };
      data.paymentMethods.push(created);
      return created;
    },
    'spending.update_payment_method': ({ id, name, icon }) => {
      const current = findMethod(data, id);
      if (icon) checkedIcon(icon);
      const next = { ...current, name: name === undefined ? current.name : checkedName(name), icon: icon ?? current.icon };
      data.paymentMethods = data.paymentMethods.map((item) => (item.id === id ? next : item));
      return withUsage(data, next);
    },
    'spending.delete_payment_method': ({ id }) => {
      if (findMethod(data, id).isDefault) throw invalid('the default payment method cannot be deleted');
      data.transactions = forgetMethod(data.transactions, id);
      data.paymentMethods = data.paymentMethods.filter((item) => item.id !== id);
      return {};
    },
  };
}
