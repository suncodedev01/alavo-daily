import { beforeEach, describe, expect, it, vi } from 'vitest';

const plugin = vi.hoisted(() => ({
  registerActionTypes: vi.fn(),
  onAction: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-notification', () => plugin);

import { listenForActions, readActionEvent, registerActions } from './notificationActions';

const ANDROID_PRESS = {
  actionId: 'start-cooking',
  inputValue: null,
  notification: {
    id: 42,
    title: 'Hôm nay ăn gì?',
    body: 'Bún chả',
    actionTypeId: 'dish-reminder',
    extra: { recipeId: 'recipe-1' },
  },
};

beforeEach(() => vi.resetAllMocks());

describe('registerActions', () => {
  it('hands each action type to the plugin with the labels as titles', async () => {
    plugin.registerActionTypes.mockResolvedValue(undefined);
    await registerActions([
      { id: 'dish-reminder', actions: [{ id: 'start-cooking', label: 'Bắt đầu nấu' }] },
    ]);
    expect(plugin.registerActionTypes).toHaveBeenCalledWith([
      { id: 'dish-reminder', actions: [{ id: 'start-cooking', title: 'Bắt đầu nấu' }] },
    ]);
  });
});

describe('readActionEvent', () => {
  it('reads the button, the notification and what it was about', () => {
    expect(readActionEvent(ANDROID_PRESS)).toEqual({
      actionId: 'start-cooking',
      actionTypeId: 'dish-reminder',
      notificationId: 42,
      title: 'Hôm nay ăn gì?',
      body: 'Bún chả',
      data: { recipeId: 'recipe-1' },
    });
  });

  it('keeps only text values of the extra payload', () => {
    const event = readActionEvent({ actionId: 'a', notification: { extra: { id: 'x', count: 3 } } });
    expect(event?.data).toEqual({ id: 'x' });
  });

  it('still reports the button when the system sends no notification', () => {
    expect(readActionEvent({ actionId: 'snooze-10', notification: null })).toEqual({
      actionId: 'snooze-10',
      actionTypeId: null,
      notificationId: null,
      title: '',
      body: '',
      data: {},
    });
  });

  it.each([null, 'tap', 42, { notification: {} }, { actionId: 7 }])('ignores %j', (payload) => {
    expect(readActionEvent(payload)).toBeNull();
  });
});

describe('listenForActions', () => {
  it('passes each button press to the handler', () => {
    plugin.onAction.mockResolvedValue({ unregister: vi.fn() });
    const handler = vi.fn();
    listenForActions(handler);
    const callback = plugin.onAction.mock.calls[0]![0] as (payload: unknown) => void;
    callback(ANDROID_PRESS);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ actionId: 'start-cooking' }));
  });

  it('does not call the handler for a payload it cannot read', () => {
    plugin.onAction.mockResolvedValue({ unregister: vi.fn() });
    const handler = vi.fn();
    listenForActions(handler);
    (plugin.onAction.mock.calls[0]![0] as (payload: unknown) => void)({});
    expect(handler).not.toHaveBeenCalled();
  });

  it('stops listening when the returned function is called', async () => {
    const unregister = vi.fn();
    plugin.onAction.mockResolvedValue({ unregister });
    listenForActions(vi.fn())();
    await vi.waitFor(() => expect(unregister).toHaveBeenCalled());
  });
});
