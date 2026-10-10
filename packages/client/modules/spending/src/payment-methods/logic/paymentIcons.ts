import type { PaymentIcon } from '@alavo-daily/common/engine';

export const PAYMENT_ICON_CHOICES: { icon: PaymentIcon; label: string }[] = [
  { icon: 'money', label: 'Tiền mặt' },
  { icon: 'bank', label: 'Ngân hàng' },
  { icon: 'device-mobile', label: 'Điện thoại' },
  { icon: 'credit-card', label: 'Thẻ' },
  { icon: 'coins', label: 'Đồng xu' },
];

export const DEFAULT_PAYMENT_ICON: PaymentIcon = 'credit-card';
