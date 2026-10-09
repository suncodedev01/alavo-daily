import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StickerTile } from '../stickers';
import { NavItem } from './NavItem';

describe('NavItem leading content', () => {
  it('replaces the line icon with the given content', () => {
    render(
      <NavItem
        icon="wallet"
        leading={<StickerTile icon="wallet" kind="module" size="sm" />}
        label="Chi tiêu"
      />,
    );
    const item = screen.getByRole('button', { name: 'Chi tiêu' });
    expect(item.querySelector('img')).toHaveAttribute('data-sticker', 'credit_card');
    expect(item.querySelector('svg')).toBeNull();
  });
});
