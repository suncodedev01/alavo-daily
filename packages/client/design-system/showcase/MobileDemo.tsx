import { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Eyebrow,
  IconButton,
  Meter,
  MobileFrame,
  ModulePill,
  Pill,
  SearchField,
  Sheet,
  StatusChip,
  TabBar,
  TabBarAction,
  TabBarItem,
  TopBar,
} from '@/index';
import { TRANSACTIONS, formatVnd } from './sampleData';
import { TransactionRow } from './TransactionRow';

const SPEND_TABS = [
  { id: 'overview', icon: 'squares-four', label: 'Tổng quan' },
  { id: 'tx', icon: 'receipt', label: 'Giao dịch' },
  { id: 'budget', icon: 'chart-pie-slice', label: 'Ngân sách' },
  { id: 'goals', icon: 'target', label: 'Mục tiêu' },
];
const HOME_TABS = [
  { id: 'today', icon: 'house', label: 'Hôm nay' },
  { id: 'spend', icon: 'wallet', label: 'Chi tiêu' },
  { id: 'food', icon: 'cooking-pot', label: 'Món ăn' },
  { id: 'settings', icon: 'gear', label: 'Cài đặt' },
];

function SpendTabBar({ active, onSelect, onAdd }: { active: string; onSelect: (id: string) => void; onAdd: () => void }) {
  const tab = (item: (typeof SPEND_TABS)[number]) => (
    <TabBarItem key={item.id} icon={item.icon} label={item.label} active={active === item.id} onClick={() => onSelect(item.id)} />
  );
  return (
    <TabBar>
      {tab(SPEND_TABS[0] as (typeof SPEND_TABS)[number])}
      {tab(SPEND_TABS[1] as (typeof SPEND_TABS)[number])}
      <TabBarAction icon="plus" label="Thêm giao dịch" onClick={onAdd} />
      {tab(SPEND_TABS[2] as (typeof SPEND_TABS)[number])}
      {tab(SPEND_TABS[3] as (typeof SPEND_TABS)[number])}
    </TabBar>
  );
}

function HomeTabBar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  const [first, second, third, fourth] = HOME_TABS;
  const tab = (item: (typeof HOME_TABS)[number] | undefined) =>
    item ? <TabBarItem key={item.id} icon={item.icon} label={item.label} active={active === item.id} onClick={() => onSelect(item.id)} /> : null;
  return (
    <TabBar>
      {tab(first)}
      {tab(second)}
      <TabBarAction icon="compass" label="Khám phá" showLabel active={active === 'explore'} onClick={() => onSelect('explore')} />
      {tab(third)}
      {tab(fourth)}
    </TabBar>
  );
}

function OverviewScreen() {
  return (
    <>
      <div className="px-1">
        <div className="text-base font-semibold">Chào Linh</div>
        <div className="text-row text-text-muted">Thứ Sáu, 9 tháng 10</div>
      </div>
      <Card padding="lg">
        <Eyebrow>Tổng số dư</Eyebrow>
        <div className="mt-2 mb-4 text-display font-semibold whitespace-nowrap">{formatVnd(40490000)}</div>
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
      <Card padding="sm">
        <CardHeader className="mb-2">
          <CardTitle className="flex-1">Cần bạn quyết định</CardTitle>
          <StatusChip status="needs_you" />
        </CardHeader>
        <p className="mb-3 text-sm text-text-secondary">Ăn uống đã dùng <b>88%</b> ngân sách, còn 310.000 ₫ cho 22 ngày.</p>
        <Meter value={0.88} label="Ăn uống" />
        <div className="mt-4 flex gap-2">
          <Button size="lg" className="flex-1">Tăng thêm 500.000 ₫</Button>
          <Button size="lg" variant="outline">Giữ nguyên</Button>
        </div>
      </Card>
      <Card padding="sm">
        <CardHeader className="mb-1">
          <CardTitle>Giao dịch gần đây</CardTitle>
          <Button variant="ghost" size="sm">Xem tất cả</Button>
        </CardHeader>
        {TRANSACTIONS.slice(0, 3).map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </Card>
    </>
  );
}

function TransactionsScreen() {
  return (
    <>
      <h1 className="px-1 pt-1 text-2xl font-semibold">Giao dịch</h1>
      <SearchField value="" onValueChange={() => undefined} placeholder="Tìm theo tên hoặc danh mục" />
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
        <Pill selected>Tất cả</Pill>
        <Pill>Chi</Pill>
        <Pill>Thu</Pill>
        <Pill>Định kỳ</Pill>
        <Pill>Ví MoMo</Pill>
      </div>
      <Card padding="sm">
        {TRANSACTIONS.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </Card>
    </>
  );
}

export function MobileDemo() {
  const [variant, setVariant] = useState<'spend' | 'home'>('spend');
  const [active, setActive] = useState('overview');
  const [sheet, setSheet] = useState(false);
  const spend = variant === 'spend';
  const bar = spend ? (
    <SpendTabBar active={active} onSelect={setActive} onAdd={() => setSheet(true)} />
  ) : (
    <HomeTabBar active={active} onSelect={setActive} />
  );
  const switchVariant = () => {
    setVariant(spend ? 'home' : 'spend');
    setActive(spend ? 'explore' : 'overview');
  };
  return (
    <MobileFrame
      topBar={
        <TopBar leading={<ModulePill icon={spend ? 'wallet' : 'house'} name={spend ? 'Chi tiêu' : 'Hôm nay'} aria-label="Chuyển ứng dụng" />}>
          <IconButton icon="cloud-slash" label="Đồng bộ Google: chưa kết nối" variant="surface" size="lg" />
          <IconButton icon="bell" label="Thông báo" variant="surface" size="lg" badge onClick={switchVariant} />
        </TopBar>
      }
      tabBar={bar}
    >
      {active === 'tx' ? <TransactionsScreen /> : <OverviewScreen />}
      <Sheet open={sheet} onOpenChange={setSheet} title="Thêm giao dịch" footer={<Button size="lg" onClick={() => setSheet(false)}>Lưu giao dịch</Button>}>
        <div className="text-center text-display font-semibold">0 ₫</div>
      </Sheet>
    </MobileFrame>
  );
}
