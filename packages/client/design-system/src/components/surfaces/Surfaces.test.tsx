import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StatusChip } from '../controls/StatusChip';
import { Card, CardBody, CardHeader, CardTitle } from './Card';
import { ContextSection } from './ContextSection';
import { Eyebrow } from './Eyebrow';
import { FloatingCard } from './FloatingCard';
import { IconTile } from './IconTile';

describe('Card', () => {
  it('renders header, title and body with the card shadow token', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Cần bạn quyết định</CardTitle>
        </CardHeader>
        <CardBody>Nội dung</CardBody>
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Cần bạn quyết định' })).toBeInTheDocument();
    expect(screen.getByTestId('card').className).toContain('shadow-card');
    expect(screen.getByTestId('card').className).toContain('rounded-xl');
  });

  it('never uses a grey or black utility shadow', () => {
    render(<Card data-testid="card" />);
    expect(screen.getByTestId('card').className).not.toMatch(/shadow-(sm|md|lg|xl|2xl)/);
  });
});

describe('FloatingCard', () => {
  it('applies the pane recipe: 8px inset, rounded-lg, card shadow', () => {
    render(<FloatingCard data-testid="pane" />);
    const className = screen.getByTestId('pane').className;
    expect(className).toContain('m-2');
    expect(className).toContain('rounded-lg');
    expect(className).toContain('shadow-card');
  });

  it('supports the raised tone and semantic elements', () => {
    render(<FloatingCard as="aside" tone="raised" aria-label="Thanh bên" />);
    expect(screen.getByRole('complementary', { name: 'Thanh bên' }).className).toContain('bg-surface-raised');
  });
});

describe('IconTile and Eyebrow', () => {
  it.each([
    ['sm', 'size-8'],
    ['md', 'size-9'],
    ['lg', 'size-12'],
  ] as const)('renders the %s size', (size, className) => {
    const { container } = render(<IconTile icon="car" size={size} />);
    expect(container.firstElementChild?.className).toContain(className);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('tints by tone', () => {
    const { container } = render(<IconTile icon="car" tone="accent" />);
    expect(container.firstElementChild?.className).toContain('bg-accent');
  });

  it('Eyebrow applies the 11px uppercase label recipe', () => {
    render(<Eyebrow>Tổng số dư</Eyebrow>);
    expect(screen.getByText('Tổng số dư').className).toContain('eyebrow');
  });

  it('Eyebrow can render as another element', () => {
    render(<Eyebrow as="h2">Ngân sách</Eyebrow>);
    expect(screen.getByRole('heading', { name: 'Ngân sách' })).toBeInTheDocument();
  });
});

describe('ContextSection', () => {
  it('starts closed by default and toggles on click', async () => {
    render(<ContextSection title="Lịch sử">Chưa có thay đổi</ContextSection>);
    const trigger = screen.getByRole('button', { name: 'Lịch sử' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Chưa có thay đổi')).toBeVisible();
  });

  it('can start open', () => {
    render(<ContextSection title="Chi tiết" defaultOpen>Nội dung</ContextSection>);
    expect(screen.getByRole('button', { name: 'Chi tiết' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles from the keyboard', async () => {
    render(<ContextSection title="Chi tiết">Nội dung</ContextSection>);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Chi tiết' })).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Chi tiết' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows a trailing chip in the header row', () => {
    render(
      <ContextSection title="Đang chờ bạn" trailing={<StatusChip status="needs_you" />}>
        x
      </ContextSection>,
    );
    expect(screen.getByRole('button', { name: /Đang chờ bạn/ })).toHaveTextContent('Cần bạn');
  });

  it('reports open changes and supports controlled mode', async () => {
    const onOpenChange = vi.fn();
    render(
      <ContextSection title="Chi tiết" open={false} onOpenChange={onOpenChange}>
        x
      </ContextSection>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Chi tiết' }));
    expect(onOpenChange).toHaveBeenCalledWith(true, expect.anything());
    expect(screen.getByRole('button', { name: 'Chi tiết' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('uses a 40px header row', () => {
    render(<ContextSection title="Chi tiết">x</ContextSection>);
    expect(screen.getByRole('button', { name: 'Chi tiết' }).className).toContain('h-10');
  });
});
