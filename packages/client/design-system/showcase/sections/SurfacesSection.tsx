import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Collapsible,
  ContextSection,
  Eyebrow,
  FloatingCard,
  IconTile,
  Meter,
  StatusChip,
} from '@/index';
import { Demo, Row, Section } from '../Section';

export function SurfacesSection() {
  return (
    <Section id="surfaces" title="Bề mặt">
      <Demo title="Card · CardHeader · CardTitle · CardBody">
        <Card padding="md">
          <Eyebrow>Tổng số dư</Eyebrow>
          <div className="mt-2 mb-4 text-display font-semibold whitespace-nowrap">40.490.000 ₫</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-tint p-3">
              <div className="text-row text-text-muted">Thu tháng 10</div>
              <div className="text-base font-semibold text-income-fg">+32.500.000 ₫</div>
            </div>
            <div className="rounded-lg bg-surface-tint p-3">
              <div className="text-row text-text-muted">Chi tháng 10</div>
              <div className="text-base font-semibold">11.740.000 ₫</div>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <CardHeader>
            <CardTitle>Cần bạn quyết định</CardTitle>
            <StatusChip status="needs_you" />
          </CardHeader>
          <CardBody>
            <p className="mb-3">
              Ăn uống đã dùng <b>88%</b> ngân sách, còn 310.000 ₫ cho 22 ngày.
            </p>
            <Meter value={0.88} label="Ăn uống" />
          </CardBody>
        </Card>
      </Demo>
      <Demo title="IconTile · Eyebrow">
        <Row label="kích cỡ sm · md · lg">
          <IconTile icon="fork-knife" size="sm" />
          <IconTile icon="car" />
          <IconTile icon="cooking-pot" size="lg" />
        </Row>
        <Row label="tone neutral · brand · accent · solid">
          <IconTile icon="shopping-bag" />
          <IconTile icon="book-open" tone="brand" size="lg" />
          <IconTile icon="check-circle" tone="accent" />
          <IconTile icon="wallet" tone="solid" />
        </Row>
        <Eyebrow>Ngân sách tháng (không bắt buộc)</Eyebrow>
      </Demo>
      <Demo title="FloatingCard (ngăn nổi)" wide>
        <div className="rounded-lg bg-paper p-2">
          <FloatingCard tone="raised" className="m-0 p-4 text-sm">
            Ngăn nổi: khoảng đệm 8px, bo rounded-lg, viền mảnh và bóng card.
          </FloatingCard>
        </div>
      </Demo>
      <Demo title="ContextSection / Collapsible">
        <Card padding="none" className="overflow-hidden">
          <ContextSection title="Chi tiết" defaultOpen>
            <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-text-muted">Ví</dt>
              <dd>Ví MoMo</dd>
              <dt className="text-text-muted">Hạng mục</dt>
              <dd>Ăn uống</dd>
            </dl>
          </ContextSection>
          <ContextSection title="Đang chờ bạn" trailing={<StatusChip status="needs_you" />}>
            <p className="text-sm text-text-secondary">Tăng ngân sách hoặc giữ nguyên.</p>
          </ContextSection>
          <Collapsible title="Lịch sử">
            <p className="text-sm text-text-secondary">Chưa có thay đổi nào.</p>
          </Collapsible>
        </Card>
      </Demo>
    </Section>
  );
}
