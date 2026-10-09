import { Avatar, EmptyState, Meter, ProgressRing, Skeleton, StatusChip, Button, type Status } from '@/index';
import { Demo, Row, Section } from '../Section';
import linh from '../assets/linh.jpg';

const STATUSES: Status[] = ['open', 'working', 'needs_you', 'your_call', 'resolved'];

const BUDGETS = [
  { name: 'Ăn uống', value: 0.88, spent: '2.290.000 ₫', budget: '2.600.000 ₫' },
  { name: 'Đi lại', value: 0.42, spent: '337.000 ₫', budget: '800.000 ₫' },
  { name: 'Mua sắm', value: 1.18, spent: '1.780.000 ₫', budget: '1.500.000 ₫' },
];

export function DataSection() {
  return (
    <Section id="data" title="Trạng thái và dữ liệu">
      <Demo title="StatusChip · năm trạng thái">
        <Row>
          {STATUSES.map((status) => (
            <StatusChip key={status} status={status} />
          ))}
        </Row>
        <Row label="nhãn tuỳ chỉnh qua labels">
          <StatusChip status="needs_you" labels={{ needs_you: 'Chờ bạn duyệt' }} />
          <StatusChip status="resolved">Đã kết nối</StatusChip>
        </Row>
      </Demo>
      <Demo title="Meter · normal / warn (từ 85%) / over">
        {BUDGETS.map((budget) => (
          <div key={budget.name} className="grid gap-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{budget.name}</span>
              <span className="text-text-muted">
                {budget.spent} / {budget.budget}
              </span>
            </div>
            <Meter value={budget.value} label={budget.name} />
          </div>
        ))}
      </Demo>
      <Demo title="ProgressRing">
        <Row>
          <ProgressRing value={0.68} size={140} label="Đã dùng 68% ngân sách">
            <div className="text-meta text-text-muted">Còn lại</div>
            <div className="text-title font-semibold">8.250.000 ₫</div>
          </ProgressRing>
          <ProgressRing value={0.9} size={56} strokeWidth={6} label="Hẹn giờ" />
          <ProgressRing value={1.2} size={56} strokeWidth={6} label="Vượt" />
        </Row>
      </Demo>
      <Demo title="Avatar · Skeleton">
        <Row>
          <Avatar name="Linh Nguyễn" src={linh} size="lg" />
          <Avatar name="Linh Nguyễn" src={linh} />
          <Avatar name="Mai Trần" size="lg" />
          <Avatar name="Quang" size="sm" />
        </Row>
        <div className="grid gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Demo>
      <Demo title="EmptyState" wide>
        <EmptyState
          icon="receipt"
          title="Chưa có giao dịch nào"
          description="Thêm giao dịch đầu tiên để theo dõi chi tiêu tháng này."
          action={<Button leadingIcon="plus">Thêm giao dịch</Button>}
        />
      </Demo>
    </Section>
  );
}
