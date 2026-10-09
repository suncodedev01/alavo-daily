import { useState } from 'react';
import {
  AppFrame,
  Avatar,
  Button,
  Card,
  CardHeader,
  CardTitle,
  ContextSection,
  Eyebrow,
  IconButton,
  Meter,
  ModulePill,
  NavItem,
  PageColumn,
  PaneBody,
  PaneHeader,
  Pill,
  SearchField,
  Sidebar,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  StatusChip,
  useToast,
} from '@/index';
import linh from './assets/linh.jpg';
import { BUDGETS, TRANSACTIONS, formatVnd } from './sampleData';
import { TransactionRow } from './TransactionRow';

const NAV = [
  { id: 'overview', icon: 'squares-four', label: 'Tổng quan' },
  { id: 'tx', icon: 'receipt', label: 'Giao dịch', count: 23 },
  { id: 'budget', icon: 'chart-pie-slice', label: 'Ngân sách' },
  { id: 'goals', icon: 'target', label: 'Mục tiêu' },
];
const WALLETS = [
  { icon: 'wallet', label: 'Techcombank', count: '38,4 tr' },
  { icon: 'device-mobile', label: 'Ví MoMo', count: '1,25 tr' },
  { icon: 'wallet', label: 'Tiền mặt', count: '820 k' },
];

function AppSidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  const { toast } = useToast();
  return (
    <Sidebar
      header={
        <SidebarHeader>
          <ModulePill variant="row" icon="wallet" name="Chi tiêu" aria-label="Chuyển ứng dụng" />
        </SidebarHeader>
      }
      footer={
        <SidebarFooter>
          <Avatar name="Linh Nguyễn" src={linh} />
          <span className="min-w-0 flex-1 max-compact:hidden">
            <span className="block truncate text-sm font-medium">Linh Nguyễn</span>
            <span className="block truncate text-xs text-text-muted">Gói miễn phí</span>
          </span>
          <IconButton icon="moon" label="Đổi giao diện sáng/tối" onClick={() => toast('Đã đổi giao diện')} />
        </SidebarFooter>
      }
    >
      <SidebarGroup>
        {NAV.map((item) => (
          <NavItem key={item.id} icon={item.icon} label={item.label} count={item.count} active={active === item.id} onClick={() => onSelect(item.id)} />
        ))}
      </SidebarGroup>
      <SidebarGroup label="Ví">
        {WALLETS.map((wallet) => (
          <NavItem key={wallet.label} icon={wallet.icon} label={wallet.label} count={wallet.count} />
        ))}
      </SidebarGroup>
    </Sidebar>
  );
}

function TransactionList() {
  return (
    <>
      <div className="flex h-10 shrink-0 items-center px-4 text-sm font-semibold">Giao dịch</div>
      <div className="grid gap-2 px-3 pt-1 pb-2">
        <SearchField value="" onValueChange={() => undefined} placeholder="Tìm theo tên hoặc danh mục" />
        <div className="flex gap-2">
          <Pill selected>Tất cả</Pill>
          <Pill>Chi</Pill>
          <Pill>Thu</Pill>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <Eyebrow as="div" className="px-3 pt-3 pb-1">Hôm nay · Thứ Sáu, 9/10</Eyebrow>
        {TRANSACTIONS.map((transaction, index) => (
          <TransactionRow key={transaction.id} transaction={transaction} selected={index === 2} />
        ))}
      </div>
    </>
  );
}

function ContextDock() {
  return (
    <>
      <ContextSection title="Cần bạn quyết định" defaultOpen trailing={<StatusChip status="needs_you" />}>
        <p className="mb-3 text-sm text-text-secondary">Ăn uống đã dùng <b>88%</b> ngân sách, còn 310.000 ₫ cho 22 ngày.</p>
        <Meter value={0.88} label="Ăn uống" />
        <div className="mt-4 flex gap-2">
          <Button className="flex-1">Tăng thêm 500.000 ₫</Button>
          <Button variant="outline">Giữ nguyên</Button>
        </div>
      </ContextSection>
      <ContextSection title="Sắp tới" defaultOpen>
        <p className="text-sm text-text-secondary">Thẻ tín dụng Techcombank · Thứ Hai, 12/10 · 2.340.000 ₫</p>
      </ContextSection>
      <ContextSection title="Lịch sử">
        <p className="text-sm text-text-secondary">Chưa có thay đổi nào.</p>
      </ContextSection>
    </>
  );
}

function OverviewBody() {
  return (
    <PaneBody maxWidth="page">
      <div className="grid gap-4 min-[1500px]:grid-cols-[5fr_4fr]">
        <Card padding="lg">
          <Eyebrow>Tổng số dư</Eyebrow>
          <div className="mt-2 mb-4 text-display font-semibold">{formatVnd(40490000)}</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-tint p-3">
              <div className="text-row text-text-muted">Thu tháng 10</div>
              <div className="text-base font-semibold text-income-fg">+{formatVnd(32500000)}</div>
            </div>
            <div className="rounded-lg bg-surface-tint p-3">
              <div className="text-row text-text-muted">Chi tháng 10</div>
              <div className="text-base font-semibold">{formatVnd(11740000)}</div>
            </div>
          </div>
        </Card>
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Ngân sách</CardTitle>
            <span className="text-xs text-text-muted">Tháng 10</span>
          </CardHeader>
          <div className="divide-y divide-line-hairline">
            {BUDGETS.map((budget) => (
              <div key={budget.name} className="grid gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{budget.name}</span>
                  <span className="text-text-muted">{formatVnd(budget.spent)} / {formatVnd(budget.budget)}</span>
                </div>
                <Meter value={budget.spent / budget.budget} label={budget.name} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card padding="sm">
        <CardHeader>
          <CardTitle>Giao dịch gần đây</CardTitle>
          <Button variant="ghost" size="sm">Xem tất cả</Button>
        </CardHeader>
        {TRANSACTIONS.slice(0, 3).map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </Card>
    </PaneBody>
  );
}

export function AppDemo() {
  const [active, setActive] = useState('overview');
  const [dockOpen, setDockOpen] = useState(() => window.innerWidth >= 1180);
  const title = NAV.find((item) => item.id === active)?.label ?? '';
  return (
    <AppFrame
      sidebar={<AppSidebar active={active} onSelect={setActive} />}
      list={active === 'tx' ? <TransactionList /> : undefined}
      dock={<ContextDock />}
      dockOpen={dockOpen}
    >
      <PaneHeader
        title={title}
        actions={
          <>
            <Button leadingIcon="plus">Thêm giao dịch</Button>
            <IconButton icon="bell" label="Thông báo" badge />
            <IconButton icon="list" label="Bật/tắt bảng bên phải" onClick={() => setDockOpen((open) => !open)} />
          </>
        }
      />
      <OverviewBody />
    </AppFrame>
  );
}
