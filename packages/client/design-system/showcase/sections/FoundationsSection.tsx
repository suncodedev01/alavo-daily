import { Button, Icon, MOCKUP_ICON_NAMES, iconNames, useLayout, useToast } from '@/index';
import { Demo, Row, Section } from '../Section';

const SWATCHES = [
  { name: 'paper', className: 'bg-paper' },
  { name: 'surface', className: 'bg-surface' },
  { name: 'surface-raised', className: 'bg-surface-raised' },
  { name: 'surface-tint', className: 'bg-surface-tint' },
  { name: 'surface-brand', className: 'bg-surface-brand' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'primary', className: 'bg-primary' },
  { name: 'primary-hover', className: 'bg-primary-hover' },
  { name: 'hold-bg', className: 'bg-hold-bg' },
  { name: 'wash-mint', className: 'bg-wash-mint' },
  { name: 'meter-warn', className: 'bg-meter-warn' },
  { name: 'meter-over', className: 'bg-meter-over' },
  { name: 'destructive', className: 'bg-destructive' },
  { name: 'chart-2', className: 'bg-chart-2' },
];

const SHADOWS = [
  { name: 'hairline', className: 'shadow-hairline' },
  { name: 'raised', className: 'shadow-raised' },
  { name: 'card', className: 'shadow-card' },
  { name: 'frame', className: 'shadow-frame' },
  { name: 'overlay', className: 'shadow-overlay' },
];

const TYPE_LEVELS = [
  { name: 'display 38/600', className: 'text-display font-semibold' },
  { name: '2xl 24/600', className: 'text-2xl font-semibold' },
  { name: 'title 17/600', className: 'text-title font-semibold' },
  { name: 'base 16', className: 'text-base' },
  { name: 'sm 14', className: 'text-sm' },
  { name: 'row 13', className: 'text-row' },
  { name: 'xs 12', className: 'text-xs' },
  { name: 'meta 11', className: 'text-meta' },
  { name: 'micro 10', className: 'text-micro' },
];

export function FoundationsSection() {
  const { toast } = useToast();
  const layout = useLayout();
  return (
    <Section id="foundations" title="Nền tảng">
      <Demo title="Màu (token) · sáng/tối đảo theo data-theme">
        <div className="grid grid-cols-2 gap-2">
          {SWATCHES.map((swatch) => (
            <div key={swatch.name} className="flex items-center gap-2 text-xs text-text-secondary">
              <span className={`size-6 shrink-0 rounded-md shadow-hairline ${swatch.className}`} />
              {swatch.name}
            </div>
          ))}
        </div>
      </Demo>
      <Demo title="Bóng đổ: năm bậc có tên">
        <div className="grid grid-cols-3 gap-4 p-2">
          {SHADOWS.map((shadow) => (
            <div key={shadow.name} className={`grid h-14 place-items-center rounded-lg bg-surface text-xs text-text-muted ${shadow.className}`}>
              {shadow.name}
            </div>
          ))}
        </div>
      </Demo>
      <Demo title="Chữ: mười cấp, bốn độ đậm (400/500/600/700)">
        {TYPE_LEVELS.map((level) => (
          <div key={level.name} className="flex items-baseline gap-3">
            <span className="w-28 shrink-0 text-meta text-text-muted">{level.name}</span>
            <span className={level.className}>Ăn uống · 2.600.000 ₫</span>
          </div>
        ))}
        <Row label="Eyebrow 11/600/0.1em">
          <span className="eyebrow">Tổng số dư</span>
        </Row>
        <Row label="Độ đậm">
          <span className="font-normal">400</span>
          <span className="font-medium">500</span>
          <span className="font-semibold">600</span>
          <span className="font-bold">700</span>
        </Row>
      </Demo>
      <Demo title={`Icon · ${iconNames.length} biểu tượng Phosphor (regular), bản dùng trong mockup`}>
        <div className="grid grid-cols-8 gap-1 text-text-secondary">
          {MOCKUP_ICON_NAMES.map((name) => (
            <span key={name} title={name} className="grid h-9 place-items-center rounded-md hover:bg-surface-tint">
              <Icon name={name} size="lg" />
            </span>
          ))}
        </div>
        <Row label="Icon fill · tên lạ rơi về icon tag">
          <Icon name="heart" size="xl" weight="fill" />
          <Icon name="compass-fill" size="xl" />
          <Icon name="khong-co-icon-nay" size="xl" />
        </Row>
      </Demo>
      <Demo title="Toaster · useLayout">
        <Row>
          <Button variant="outline" onClick={() => toast('Đã lưu giao dịch')}>
            Hiện toast
          </Button>
          <span className="text-sm text-text-secondary">useLayout() → {layout}</span>
        </Row>
      </Demo>
    </Section>
  );
}
