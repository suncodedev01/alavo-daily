import { EngineCallError, type Recipe } from '@alavo-daily/common/engine';
import { createFakePlatform } from '@alavo-daily/common/testing';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RecipesBackend } from '../../testing/fakeBackend';
import { GA_KHO, recipe, step } from '../../testing/fixtures';
import { renderScreen } from '../../testing/renderScreen';
import { CookingScreen } from './CookingScreen';

const footerRenders = vi.hoisted(() => vi.fn());

vi.mock('./CookingFooter', async (importOriginal) => {
  const original = await importOriginal<typeof import('./CookingFooter')>();
  return {
    ...original,
    CookingFooter: (props: Parameters<typeof original.CookingFooter>[0]) => {
      footerRenders();
      return original.CookingFooter(props);
    },
  };
});

const STEP_ONE = 'Rửa gà, chặt miếng vừa ăn rồi ướp.';
const STEP_TWO = 'Phi thơm hành và gừng, cho gà vào xào săn.';
const STEP_THREE = 'Thêm nước xâm xấp, hạ lửa nhỏ.';

const location = () => screen.getByLabelText('Đường dẫn hiện tại');

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderCooking(route = '/recipes/cook/ga-kho?servings=4', options: Partial<Parameters<typeof renderScreen>[1]> = {}) {
  return renderScreen(<CookingScreen />, { path: '/recipes/cook/:id', route, fullscreen: true, ...options });
}

async function renderLoaded(route?: string, options: Partial<Parameters<typeof renderScreen>[1]> = {}) {
  const view = renderCooking(route, options);
  await screen.findByRole('heading', { name: GA_KHO.name });
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  return view;
}

function tick(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

const clock = () => screen.getByRole('timer');

describe('cooking mode content', () => {
  it('shows the recipe, the step counter and the current step in big text', async () => {
    renderCooking();
    expect(await screen.findByRole('heading', { name: 'Gà kho gừng' })).toBeInTheDocument();
    expect(screen.getByText('Bước 1/3')).toBeInTheDocument();
    expect(within(screen.getByRole('banner')).getByText(/4 người/)).toBeInTheDocument();
    const text = screen.getByText(STEP_ONE);
    expect(text).toHaveClass('text-2xl', 'lg:text-display');
  });

  it('uses the household size when the address has no servings', async () => {
    renderCooking('/recipes/cook/ga-kho');
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    expect(within(screen.getByRole('banner')).getByText(/2 người/)).toBeInTheDocument();
    expect(screen.getByText('300 g')).toBeInTheDocument();
  });

  it('scales the ingredient checklist to the servings in the address', async () => {
    renderCooking('/recipes/cook/ga-kho?servings=8');
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    const list = screen.getByRole('list', { name: 'Nguyên liệu' });
    expect(within(list).getByText('1,2 kg')).toBeInTheDocument();
    expect(screen.getByText('Nguyên liệu · 8 người')).toBeInTheDocument();
  });

  it('ticks ingredients off', async () => {
    renderCooking();
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    const box = screen.getByRole('checkbox', { name: /Đùi gà/ });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(screen.getByRole('checkbox', { name: /Đùi gà/ })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: /Đùi gà/ }));
    expect(screen.getByRole('checkbox', { name: /Đùi gà/ })).not.toBeChecked();
  });

  it('shows an error for an unknown recipe', async () => {
    renderCooking('/recipes/cook/missing');
    expect(await screen.findByText(/Không tìm thấy dữ liệu này/)).toBeInTheDocument();
  });

  it('shows the error of the engine with a retry', async () => {
    renderCooking('/recipes/cook/ga-kho', {
      handlers: {
        'recipes.get': () => {
          throw new EngineCallError('internal', 'boom');
        },
      },
    });
    expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('offers a way back for a recipe without steps', async () => {
    const bare: Recipe = recipe({ id: 'bare', name: 'Trống', ingredients: [], steps: [] });
    renderCooking('/recipes/cook/bare', { backend: new RecipesBackend([bare]) });
    expect(await screen.findByText('Công thức này chưa có bước nào')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Quay lại công thức' }));
    expect(location()).toHaveTextContent('/recipes/list/bare');
  });
});

describe('step navigation', () => {
  it('moves with the buttons and finishes on the last step', async () => {
    renderCooking();
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    expect(screen.getByRole('button', { name: 'Bước trước' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Bước tiếp' }));
    expect(screen.getByText(STEP_TWO)).toBeInTheDocument();
    expect(screen.getByText('Bước 2/3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bước tiếp' }));
    expect(screen.getByText(STEP_THREE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bước tiếp' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bước trước' }));
    expect(screen.getByText(STEP_TWO)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bước tiếp' }));
    await user.click(screen.getByRole('button', { name: 'Hoàn thành' }));
    expect(location()).toHaveTextContent('/recipes/list/ga-kho');
  });

  it('moves with the arrow keys and stops at both ends', async () => {
    renderCooking();
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('Bước 1/3')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(screen.getByText('Bước 3/3')).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('Bước 2/3')).toBeInTheDocument();
  });

  it('closes back to the recipe', async () => {
    renderCooking();
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thoát chế độ nấu' }));
    expect(location()).toHaveTextContent('/recipes/list/ga-kho');
  });

  it('makes the navigation buttons at least 56px tall', async () => {
    renderCooking();
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    expect(screen.getByRole('button', { name: 'Bước tiếp' })).toHaveClass('h-14');
    expect(screen.getByRole('button', { name: 'Bước trước' })).toHaveClass('h-14');
  });
});

describe('step timers', () => {
  it('shows no timer for a step without one', async () => {
    renderCooking();
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('starts, counts down, pauses and resets', async () => {
    await renderLoaded();
    expect(clock()).toHaveTextContent('15:00');
    expect(screen.getByRole('progressbar', { name: 'Còn 15:00' })).toHaveAttribute('aria-valuenow', '100');
    fireStart();
    tick(3000);
    expect(clock()).toHaveTextContent('14:57');
    fireButton('Tạm dừng');
    tick(10_000);
    expect(clock()).toHaveTextContent('14:57');
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeInTheDocument();
    fireButton('Tiếp tục');
    tick(2000);
    expect(clock()).toHaveTextContent('14:55');
    fireButton('Đặt lại');
    expect(clock()).toHaveTextContent('15:00');
    expect(screen.getByRole('button', { name: 'Bắt đầu hẹn giờ' })).toBeInTheDocument();
  });

  it('moves the ring with the time', async () => {
    await renderLoaded();
    fireStart();
    tick(450_000);
    expect(screen.getByRole('progressbar', { name: 'Còn 07:30' })).toHaveAttribute('aria-valuenow', '50');
  });

  it('shows timers still running in other steps as chips', async () => {
    await renderLoaded();
    fireStart();
    tick(5000);
    fireButton('Bước tiếp');
    const chips = screen.getByRole('list', { name: 'Hẹn giờ đang chạy' });
    expect(within(chips).getByText('Bước 1 · 14:55')).toBeInTheDocument();
    tick(1000);
    expect(within(chips).getByText('Bước 1 · 14:54')).toBeInTheDocument();
    expect(clock()).toHaveTextContent('05:00');
  });

  it('keeps counting while another step is shown and is there when coming back', async () => {
    await renderLoaded();
    fireStart();
    fireButton('Bước tiếp');
    tick(60_000);
    fireButton('Bước trước');
    expect(clock()).toHaveTextContent('14:00');
  });

  it('alerts, beeps and notifies when a timer ends', async () => {
    const started = vi.fn();
    class FakeAudioContext {
      destination = {};
      createOscillator = () => ({ frequency: { value: 0 }, connect: vi.fn(), start: started, stop: vi.fn() });
      createGain = () => ({ gain: { value: 0 }, connect: vi.fn() });
      close = vi.fn(async () => undefined);
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const notify = vi.fn(async () => true);
    await renderLoaded(undefined, { platform: createFakePlatform({ notify }) });
    fireStart();
    tick(15 * 60 * 1000);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(`Hết giờ: ${STEP_ONE}`);
    expect(started).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('Hết giờ', STEP_ONE);
    expect(clock()).toHaveTextContent('00:00');
    expect(screen.getByRole('button', { name: 'Hẹn giờ lại' })).toBeInTheDocument();
    fireButton('Đã rõ');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('still alerts when the browser has no audio', async () => {
    vi.stubGlobal('AudioContext', undefined);
    await renderLoaded();
    fireStart();
    tick(15 * 60 * 1000);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('does not render the rest of the screen again when a second passes', async () => {
    await renderLoaded();
    fireStart();
    const before = footerRenders.mock.calls.length;
    tick(5000);
    expect(clock()).toHaveTextContent('14:55');
    expect(footerRenders.mock.calls.length).toBe(before);
  });

  it('updates only the clock and the ring when a second passes', async () => {
    await renderLoaded();
    fireStart();
    const container = document.body;
    const changed: Node[] = [];
    const observer = new MutationObserver((records) => records.forEach((record) => changed.push(record.target)));
    observer.observe(container, { subtree: true, childList: true, characterData: true, attributes: true });
    tick(5000);
    changed.push(...observer.takeRecords().map((record) => record.target));
    observer.disconnect();
    expect(changed.length).toBeGreaterThan(0);
    const outside = changed.filter((node) => !readoutOf(node));
    expect(outside).toEqual([]);
  });
});

function readoutOf(node: Node): Element | null {
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest('[data-timer-readout]') ?? null;
}

function fireStart() {
  fireButton('Bắt đầu hẹn giờ');
}

function fireButton(name: string) {
  act(() => {
    screen.getByRole('button', { name }).click();
  });
}

describe('keep awake', () => {
  it('holds the screen awake while cooking and says so', async () => {
    const release = vi.fn();
    const keepAwake = vi.fn(async () => release);
    const view = renderCooking('/recipes/cook/ga-kho?servings=4', { platform: createFakePlatform({ keepAwake }) });
    expect(await screen.findByText(/Màn hình luôn sáng khi đang nấu/)).toBeInTheDocument();
    expect(keepAwake).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
    view.unmount();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('releases when the screen is left even if the lock arrives late', async () => {
    const release = vi.fn();
    let resolveLock: (value: () => void) => void = () => undefined;
    const keepAwake = vi.fn(() => new Promise<() => void>((resolve) => (resolveLock = resolve)));
    const view = renderCooking('/recipes/cook/ga-kho', { platform: createFakePlatform({ keepAwake }) });
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    view.unmount();
    await act(async () => resolveLock(release));
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('says so when the platform cannot keep the screen on', async () => {
    const keepAwake = vi.fn(async () => () => undefined);
    renderCooking('/recipes/cook/ga-kho', {
      platform: createFakePlatform({
        keepAwake,
        capabilities: { backgroundReminders: false, keepAwake: false, importFromUrl: false, googleSync: true },
      }),
    });
    expect(await screen.findByText(/Không giữ được màn hình sáng/)).toBeInTheDocument();
    expect(keepAwake).not.toHaveBeenCalled();
  });

  it('says so when acquiring the lock fails', async () => {
    renderCooking('/recipes/cook/ga-kho', {
      platform: createFakePlatform({ keepAwake: async () => Promise.reject(new Error('denied')) }),
    });
    expect(await screen.findByText(/Không giữ được màn hình sáng/)).toBeInTheDocument();
  });

  it('asks for the lock again when the page becomes visible', async () => {
    const keepAwake = vi.fn(async () => () => undefined);
    renderCooking('/recipes/cook/ga-kho', { platform: createFakePlatform({ keepAwake }) });
    await screen.findByText(/Màn hình luôn sáng khi đang nấu/);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(keepAwake).toHaveBeenCalledTimes(2));
  });
});

describe('narrow cooking mode', () => {
  it('keeps the checklist in a sheet instead of a side panel', async () => {
    renderCooking('/recipes/cook/ga-kho?servings=4', { width: 390 });
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    expect(screen.queryByRole('list', { name: 'Nguyên liệu' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nguyên liệu' }));
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByRole('list', { name: 'Nguyên liệu' })).toBeInTheDocument();
    await user.click(within(sheet).getByRole('checkbox', { name: /Gừng/ }));
    expect(within(sheet).getByRole('checkbox', { name: /Gừng/ })).toBeChecked();
  });

  it('keeps the step text above 22px and the buttons tall', async () => {
    renderCooking('/recipes/cook/ga-kho?servings=4', { width: 390 });
    await screen.findByRole('heading', { name: 'Gà kho gừng' });
    expect(screen.getByText(STEP_ONE)).toHaveClass('text-2xl');
    expect(screen.getByRole('button', { name: 'Bước tiếp' })).toHaveClass('h-14');
    expect(screen.getByRole('button', { name: 'Bước trước' })).toHaveClass('size-14');
    expect(screen.getByRole('button', { name: 'Nguyên liệu' })).toHaveClass('size-14');
  });
});

describe('recipe with a single timed step', () => {
  it('works with only one step', async () => {
    const solo = recipe({
      id: 'solo',
      name: 'Một bước',
      steps: [step('a', 'Luộc trứng.', 1)],
      ingredients: GA_KHO.ingredients,
    });
    renderCooking('/recipes/cook/solo', { backend: new RecipesBackend([solo]) });
    await screen.findByRole('heading', { name: 'Một bước' });
    expect(screen.getByText('Bước 1/1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hoàn thành' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bước tiếp' })).not.toBeInTheDocument();
  });
});
