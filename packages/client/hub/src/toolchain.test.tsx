import { render, screen } from '@testing-library/react';
import { Button } from '@alavo-daily/design-system';
import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('renders a design-system component from a consumer package', () => {
    render(<Button>Lưu</Button>);
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeInTheDocument();
  });
});
