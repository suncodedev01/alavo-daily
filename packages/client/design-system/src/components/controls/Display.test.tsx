import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, initialsOf } from './Avatar';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Meter, toneForValue } from './Meter';
import { ProgressRing } from './ProgressRing';
import { Skeleton } from './Skeleton';
import { DEFAULT_STATUS_LABELS, StatusChip, type Status } from './StatusChip';

describe('Meter', () => {
  it('exposes progressbar semantics with aria values', () => {
    render(<Meter value={0.4} label="Đi lại" />);
    const bar = screen.getByRole('progressbar', { name: 'Đi lại' });
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it.each([
    [0.4, 'normal'],
    [0.84, 'normal'],
    [0.85, 'warn'],
    [1, 'warn'],
    [1.2, 'over'],
  ] as const)('derives the %s tone as %s', (value, tone) => {
    expect(toneForValue(value)).toBe(tone);
    render(<Meter value={value} label={`m${value}`} />);
    expect(screen.getByRole('progressbar', { name: `m${value}` })).toHaveAttribute('data-tone', tone);
  });

  it('lets an explicit tone win over the derived one', () => {
    render(<Meter value={0.2} tone="over" label="x" />);
    expect(screen.getByRole('progressbar', { name: 'x' })).toHaveAttribute('data-tone', 'over');
  });

  it('caps the fill at 100% while reporting the real percentage', () => {
    const { container } = render(<Meter value={1.18} label="Mua sắm" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '118');
    expect((container.querySelector('i') as HTMLElement).style.width).toBe('100%');
  });

  it('uses the warn and over colour tokens', () => {
    const { container, rerender } = render(<Meter value={0.9} label="a" />);
    expect(container.querySelector('i')?.className).toContain('bg-meter-warn');
    rerender(<Meter value={1.5} label="a" />);
    expect(container.querySelector('i')?.className).toContain('bg-meter-over');
  });
});

describe('ProgressRing', () => {
  it('exposes progressbar semantics and renders its centre content', () => {
    render(
      <ProgressRing value={0.68} label="Đã dùng 68%">
        <span>Còn lại</span>
      </ProgressRing>,
    );
    expect(screen.getByRole('progressbar', { name: 'Đã dùng 68%' })).toHaveAttribute('aria-valuenow', '68');
    expect(screen.getByText('Còn lại')).toBeInTheDocument();
  });

  it('draws the arc proportionally to the value', () => {
    const { container } = render(<ProgressRing value={0.5} size={100} strokeWidth={10} label="r" />);
    const arc = container.querySelectorAll('circle')[1] as SVGCircleElement;
    const circumference = 2 * Math.PI * 45;
    expect(Number(arc.getAttribute('stroke-dasharray')?.split(' ')[0])).toBeCloseTo(circumference / 2, 3);
  });
});

describe('StatusChip', () => {
  const statuses = Object.keys(DEFAULT_STATUS_LABELS) as Status[];

  it.each(statuses)('renders the %s status with its default Vietnamese label', (status) => {
    render(<StatusChip status={status} />);
    expect(screen.getByText(DEFAULT_STATUS_LABELS[status])).toHaveAttribute('data-status', status);
  });

  it('uses the yellow hold tokens for needs_you', () => {
    render(<StatusChip status="needs_you" />);
    const chip = screen.getByText('Cần bạn');
    expect(chip.className).toContain('bg-hold-bg');
    expect(chip.className).toContain('text-hold-fg');
    expect(chip.className).toContain('border-hold-edge');
  });

  it('uses the mint wash for resolved', () => {
    render(<StatusChip status="resolved" />);
    expect(screen.getByText('Đã xong').className).toContain('bg-wash-mint');
  });

  it('prefers children, then label, then labels, then the default', () => {
    const { rerender } = render(
      <StatusChip status="open" labels={{ open: 'Mở (labels)' }} label="Mở (label)">
        Mở (children)
      </StatusChip>,
    );
    expect(screen.getByText('Mở (children)')).toBeInTheDocument();
    rerender(<StatusChip status="open" labels={{ open: 'Mở (labels)' }} label="Mở (label)" />);
    expect(screen.getByText('Mở (label)')).toBeInTheDocument();
    rerender(<StatusChip status="open" labels={{ open: 'Mở (labels)' }} />);
    expect(screen.getByText('Mở (labels)')).toBeInTheDocument();
  });
});

describe('Avatar', () => {
  it('derives initials from the name', () => {
    expect(initialsOf('Linh Nguyễn')).toBe('LN');
    expect(initialsOf('quang')).toBe('Q');
    expect(initialsOf('  ')).toBe('');
  });

  it('shows initials as a fallback and the name as accessible label', () => {
    render(<Avatar name="Mai Trần" />);
    expect(screen.getByRole('img', { name: 'Mai Trần' })).toHaveTextContent('MT');
  });
});

describe('Skeleton and EmptyState', () => {
  it('hides the skeleton from assistive technology', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders title, description and action', () => {
    render(
      <EmptyState
        icon="receipt"
        title="Chưa có giao dịch"
        description="Thêm giao dịch đầu tiên."
        action={<Button>Thêm</Button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Chưa có giao dịch' })).toBeInTheDocument();
    expect(screen.getByText('Thêm giao dịch đầu tiên.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm' })).toBeInTheDocument();
  });
});
