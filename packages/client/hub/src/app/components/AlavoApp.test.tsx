import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EngineCallError, type EngineClient } from '@alavo-daily/common';
import { createFakePlatform } from '@alavo-daily/common/testing';

import { createHubEngine } from '../../testing/hubEngine';
import { TEST_MODULES, setViewportWidth } from '../../testing/renderHub';
import { AlavoApp } from './AlavoApp';
import { describeFailure } from '../logic/describeFailure';

beforeEach(() => {
  setViewportWidth(1280);
  window.location.hash = '';
});
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.lang = '';
});

function renderApp(engine: EngineClient) {
  return render(<AlavoApp engine={engine} platform={createFakePlatform()} modules={TEST_MODULES} />);
}

function failingEngine(message: string): EngineClient {
  const { engine } = createHubEngine();
  return Object.assign(engine, { ready: Promise.reject(new Error(message)) });
}

describe('engine gate', () => {
  it('shows a loading skeleton until the database is open', async () => {
    const { engine } = createHubEngine();
    const never = new Promise<{ deviceId: string }>(() => undefined);
    renderApp(Object.assign(engine, { ready: never }));
    expect(screen.getByRole('status', { name: 'Đang mở dữ liệu' })).toBeInTheDocument();
  });

  it('explains a second open tab and tells the person what to do', async () => {
    renderApp(failingEngine(JSON.stringify({ code: 'internal', message: 'already_open_in_another_tab' })));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Alavo Daily đang mở ở một tab khác');
    expect(alert).toHaveTextContent('Hãy đóng tab kia');
    expect(screen.getByRole('button', { name: 'Tải lại' })).toBeInTheDocument();
  });

  it('explains that the browser refuses to keep data', async () => {
    renderApp(failingEngine('storage_unavailable: OPFS is not available'));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Trình duyệt không cho lưu dữ liệu');
    expect(alert).toHaveTextContent('thoát chế độ ẩn danh');
  });

  it('shows a generic failure with the technical detail for anything else', async () => {
    renderApp(failingEngine('disk on fire'));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Không mở được dữ liệu');
    expect(alert).toHaveTextContent('disk on fire');
  });

  it('shows a failure when the settings cannot be read', async () => {
    const { engine } = createHubEngine(
      {},
      {
        'hub.get_settings': () => {
          throw new EngineCallError('db', 'settings broken');
        },
      },
    );
    renderApp(engine);
    expect(await screen.findByRole('alert')).toHaveTextContent('settings broken');
  });
});

describe('boot', () => {
  it('lands on Today once the settings are loaded', async () => {
    const { engine } = createHubEngine();
    renderApp(engine);
    expect(await screen.findByRole('heading', { name: 'Chào bạn' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/today');
  });

  it('sets the page language from the settings', async () => {
    const { engine } = createHubEngine();
    renderApp(engine);
    await screen.findByRole('heading', { name: 'Chào bạn' });
    expect(document.documentElement.lang).toBe('vi');
  });
});

describe('theme', () => {
  const withTheme = (theme: 'light' | 'dark' | 'system') => ({
    settings: { language: 'vi', theme, householdSize: 2, pinnedModules: [], recentModules: [] },
  });

  it('applies a dark theme to the html element', async () => {
    renderApp(createHubEngine(withTheme('dark')).engine);
    await screen.findByRole('heading', { name: 'Chào bạn' });
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('applies a light theme to the html element', async () => {
    renderApp(createHubEngine(withTheme('light')).engine);
    await screen.findByRole('heading', { name: 'Chào bạn' });
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('removes the attribute for the system theme', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    renderApp(createHubEngine(withTheme('system')).engine);
    await screen.findByRole('heading', { name: 'Chào bạn' });
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });

  it('switches the theme from the sidebar toggle and saves it', async () => {
    const user = userEvent.setup();
    const { engine, state } = createHubEngine(withTheme('light'));
    renderApp(engine);
    await user.click(await screen.findByRole('button', { name: 'Đổi giao diện sáng/tối' }));
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'dark'));
    expect(state.settings.theme).toBe('dark');
  });
});

describe('describeFailure', () => {
  it('recognises both engine failure codes inside JSON or plain text', () => {
    expect(describeFailure('{"message":"already_open_in_another_tab"}').title).toMatch(/tab khác/);
    expect(describeFailure('storage_unavailable').title).toMatch(/không cho lưu/);
    expect(describeFailure('boom')).toMatchObject({ detail: 'boom' });
  });
});
