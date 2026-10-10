import type { MoreSection } from '@alavo-daily/common/modules';

import { BillsDialog } from '../bills';
import { CategoriesDialog, CategoryOrderDialog } from '../categories';
import { PaymentMethodsDialog } from '../payment-methods';
import { BankAccountsDialog } from '../wallets';
import { useExportEverything } from './useExportEverything';

export const spendingMoreSections: MoreSection[] = [
  {
    id: 'categories',
    title: 'Hạng mục',
    items: [
      { id: 'manage-categories', label: 'Quản lý hạng mục', icon: 'tag', description: 'Thêm, sửa, xoá hạng mục chi và thu', target: { dialog: CategoriesDialog } },
      { id: 'order', label: 'Hạng mục hiện ở ngoài', icon: 'list', description: 'Sắp xếp thứ tự hạng mục', target: { dialog: CategoryOrderDialog } },
    ],
  },
  {
    id: 'plans',
    title: 'Kế hoạch',
    items: [
      { id: 'estimates', label: 'Dự toán', icon: 'calculator', description: 'Liệt kê khoản cần mua và xem tiền đã đủ chưa', target: { screen: '/spending/estimates' } },
      { id: 'goals', label: 'Mục tiêu', icon: 'target', description: 'Tiền để dành cho việc lớn', target: { screen: '/spending/goals' } },
      { id: 'budgets', label: 'Ngân sách', icon: 'chart-pie-slice', description: 'Hạn mức chi theo từng hạng mục', target: { screen: '/spending/budgets' } },
      { id: 'bills', label: 'Khoản định kỳ', icon: 'repeat', description: 'Khoản phải trả hằng tháng', target: { dialog: BillsDialog } },
    ],
  },
  {
    id: 'accounts',
    title: 'Tài khoản và thanh toán',
    items: [
      { id: 'payment-methods', label: 'Hình thức thanh toán', icon: 'credit-card', description: 'Tiền mặt, chuyển khoản, quẹt thẻ', target: { dialog: PaymentMethodsDialog } },
      { id: 'bank-accounts', label: 'Số tài khoản ngân hàng', icon: 'bank', description: 'Số tài khoản để tra cứu và sao chép', target: { dialog: BankAccountsDialog } },
      { id: 'import', label: 'Nhập sao kê ngân hàng', icon: 'upload-simple', description: 'Đọc giao dịch từ tệp sao kê', target: { screen: '/spending/import' } },
    ],
  },
  {
    id: 'preferences',
    title: 'Tuỳ chỉnh',
    items: [
      { id: 'spending-reminders', label: 'Nhắc nhở chi tiêu', icon: 'bell', description: 'Gần hết ngân sách, khoản sắp đến hạn', target: { screen: '/settings/notifications' } },
    ],
  },
  {
    id: 'data',
    title: 'Dữ liệu',
    items: [
      { id: 'export', label: 'Xuất ra bảng tính', icon: 'download-simple', description: 'Lưu mọi giao dịch ra một tệp', target: { useAction: useExportEverything } },
    ],
  },
];
