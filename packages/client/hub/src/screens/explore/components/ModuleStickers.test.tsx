import { hasSticker } from '@alavo-daily/design-system';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { HOME_MODULE } from '../../../module-navigation/logic/navigation';
import { renderHub, setViewportWidth } from '../../../testing/renderHub';
import { COMING_APPS } from '../logic/explore';

beforeEach(() => setViewportWidth(1280));

describe('module icons', () => {
  it('have a sticker for Today and every coming-soon app', () => {
    const icons = [HOME_MODULE.icon, ...COMING_APPS.map((app) => app.icon)];
    expect(icons.filter((icon) => !hasSticker(icon))).toEqual([]);
  });
});

describe('module stickers on screen', () => {
  it('draws a sticker on each app card and each coming-soon row of Explore', async () => {
    renderHub('/explore');
    const open = await screen.findByRole('button', { name: 'Mở Alpha' });
    expect(open.closest('div.grid')?.querySelector('img')).toHaveAttribute('data-sticker', 'credit_card');
    expect(screen.getByText('Công việc').closest('li')?.querySelector('img')).toHaveAttribute(
      'data-sticker',
      'check_mark_button',
    );
  });

  it('draws a sticker in front of every app in the switcher menu', async () => {
    const user = userEvent.setup();
    renderHub('/today');
    await user.click(await screen.findByRole('button', { name: /Chuyển ứng dụng/ }));
    const items = within(await screen.findByRole('menu')).getAllByRole('menuitemradio');
    const stickers = items.map((item) => item.querySelector('img')?.getAttribute('data-sticker'));
    expect(stickers).toEqual(['house_with_garden', 'credit_card', 'pot_of_food']);
  });

  it('draws a sticker on each pinned app in the sidebar', async () => {
    renderHub('/today', {
      state: {
        settings: {
          language: 'vi',
          theme: 'system',
          householdSize: 2,
          pinnedModules: ['beta'],
          recentModules: [],
        },
      },
    });
    const sidebar = await screen.findByRole('button', { name: 'Beta' });
    expect(sidebar.querySelector('img')).toHaveAttribute('data-sticker', 'pot_of_food');
  });
});
