import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { eventFileName } from './eventFile';
import { createWorld, type SimulatedDevice } from './testing/world';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function connected(device: SimulatedDevice) {
  await device.orchestrator.connect();
}

function twoDevices() {
  const world = createWorld();
  return { ...world, a: world.addDevice('dev-a'), b: world.addDevice('dev-b') };
}

describe('connecting', () => {
  it('signs in, makes the folder, uploads this device file and reports a finished round', async () => {
    const { a, drive } = twoDevices();
    a.engine.write('tx1', 'Phở');
    await connected(a);
    const status = a.engine.statusNow();
    expect(status).toMatchObject({ state: 'idle', pendingEvents: 0, accountEmail: 'person@example.com' });
    expect(status.lastSyncedAt).not.toBeNull();
    expect(drive.filesNamed(eventFileName('dev-a'))).toHaveLength(1);
    expect(drive.filesNamed('Alavo Daily Backup')).toHaveLength(1);
  });

  it('stays unconnected when the person closes the sign-in window', async () => {
    const { a } = twoDevices();
    a.auth.refuseSignIn = true;
    await expect(a.orchestrator.connect()).rejects.toThrow('popup_closed');
    expect(a.engine.statusNow().state).toBe('off');
  });

  it('does nothing while sync is off', async () => {
    const { a, drive } = twoDevices();
    a.engine.write('tx1', 'Phở');
    await a.orchestrator.syncNow();
    expect(drive.requests).toHaveLength(0);
    expect(a.engine.statusNow().state).toBe('off');
  });
});

describe('two devices', () => {
  it('end up with the same data after each has synced', async () => {
    const { a, b } = twoDevices();
    a.engine.write('tx1', 'Phở');
    await connected(a);
    b.engine.write('tx2', 'Cà phê');
    await connected(b);
    await a.orchestrator.syncNow();
    expect(b.engine.visible()).toEqual({ tx1: 'Phở', tx2: 'Cà phê' });
    expect(a.engine.visible()).toEqual(b.engine.visible());
  });

  it('carry later edits both ways', async () => {
    const { a, b } = twoDevices();
    await connected(a);
    await connected(b);
    a.engine.write('tx1', 'từ A');
    await a.orchestrator.syncNow();
    await b.orchestrator.syncNow();
    b.engine.write('tx1', 'sửa ở B');
    await b.orchestrator.syncNow();
    await a.orchestrator.syncNow();
    expect(a.engine.visible()).toEqual({ tx1: 'sửa ở B' });
  });

  it('settle an edit made on one device while the other deleted the row: the later one wins', async () => {
    const { a, b } = twoDevices();
    a.engine.write('tx1', 'gốc');
    await connected(a);
    await connected(b);
    b.engine.write('tx1', 'B sửa trước');
    a.engine.remove('tx1');
    await a.orchestrator.syncNow();
    await b.orchestrator.syncNow();
    await a.orchestrator.syncNow();
    expect(a.engine.visible()).toEqual({});
    expect(b.engine.visible()).toEqual({});
  });

  it('settle the same race the other way: an edit after the delete brings the row back', async () => {
    const { a, b } = twoDevices();
    a.engine.write('tx1', 'gốc');
    await connected(a);
    await connected(b);
    a.engine.remove('tx1');
    b.engine.write('tx1', 'B sửa sau');
    await b.orchestrator.syncNow();
    await a.orchestrator.syncNow();
    await b.orchestrator.syncNow();
    expect(a.engine.visible()).toEqual({ tx1: 'B sửa sau' });
    expect(b.engine.visible()).toEqual(a.engine.visible());
  });

  it('skip downloading a file that has not changed since it was read', async () => {
    const { a, b, drive } = twoDevices();
    a.engine.write('tx1', 'Phở');
    await connected(a);
    await connected(b);
    const before = drive.requestsTo('GET', '/files/');
    await b.orchestrator.syncNow();
    expect(drive.requestsTo('GET', '/files/')).toBe(before);
  });

  it('read a file again once the other device changed it', async () => {
    const { a, b } = twoDevices();
    a.engine.write('tx1', 'Phở');
    await connected(a);
    await connected(b);
    a.engine.write('tx2', 'Bún');
    await a.orchestrator.syncNow();
    await b.orchestrator.syncNow();
    expect(Object.keys(b.engine.visible()).sort()).toEqual(['tx1', 'tx2']);
  });

  it('upload this device file again when it was removed from Drive, though nothing is pending', async () => {
    const { a, drive } = twoDevices();
    a.engine.write('tx1', 'Phở');
    await connected(a);
    drive.files.delete(drive.filesNamed(eventFileName('dev-a'))[0]!.id);
    await a.orchestrator.syncNow();
    expect(drive.filesNamed(eventFileName('dev-a'))).toHaveLength(1);
  });

  it('skip a damaged file from another device and still apply the rest', async () => {
    const { a, b, drive } = twoDevices();
    a.engine.write('tx1', 'Phở');
    await connected(a);
    drive.put({ name: eventFileName('dev-broken'), parents: [drive.folderId()!], content: '{not json' });
    await connected(b);
    expect(b.engine.visible()).toEqual({ tx1: 'Phở' });
    expect(b.engine.statusNow().state).toBe('idle');
  });
});

describe('a day offline', () => {
  it('reports offline, keeps the waiting changes and never calls it an error', async () => {
    const { a, drive } = twoDevices();
    await connected(a);
    a.network.online = false;
    drive.offline = true;
    a.engine.write('tx1', 'Phở');
    a.engine.write('tx2', 'Bún');
    await a.orchestrator.syncNow();
    expect(a.engine.statusNow()).toMatchObject({ state: 'offline', pendingEvents: 2, error: null });
  });

  it('sends everything as soon as the network is back', async () => {
    const { a, b, drive } = twoDevices();
    await connected(a);
    await connected(b);
    b.network.online = false;
    drive.offline = true;
    b.engine.write('tx1', 'Phở');
    b.engine.write('tx2', 'Bún');
    await b.orchestrator.syncNow();
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    drive.offline = false;
    const stop = b.orchestrator.start();
    b.network.comeBack();
    await vi.advanceTimersByTimeAsync(1000);
    await a.orchestrator.syncNow();
    stop();
    expect(b.engine.statusNow()).toMatchObject({ state: 'idle', pendingEvents: 0 });
    expect(a.engine.visible()).toEqual({ tx1: 'Phở', tx2: 'Bún' });
  });

  it('reports offline when a request fails halfway and tries again later by itself', async () => {
    const { a, drive } = twoDevices();
    a.engine.write('tx1', 'Phở');
    await connected(a);
    a.engine.write('tx2', 'Bún');
    drive.offline = true;
    await a.orchestrator.syncNow();
    expect(a.engine.statusNow().state).toBe('offline');
    drive.offline = false;
    await vi.advanceTimersByTimeAsync(1500);
    expect(a.engine.statusNow()).toMatchObject({ state: 'idle', pendingEvents: 0 });
  });
});

describe('signing in again', () => {
  it('asks for a new sign-in when the token has expired and goes on after it', async () => {
    const { a, b, drive } = twoDevices();
    await connected(a);
    await connected(b);
    b.auth.expire();
    a.engine.write('tx1', 'Phở');
    await a.orchestrator.syncNow();
    await b.orchestrator.syncNow();
    expect(b.engine.statusNow().state).toBe('needs_login');
    expect(drive.requests.filter((request) => request.method === 'GET').length).toBeGreaterThan(0);
    await b.orchestrator.connect();
    expect(b.engine.statusNow().state).toBe('idle');
    expect(b.engine.visible()).toEqual({ tx1: 'Phở' });
  });

  it('survives a 401 in the middle of a round without losing or repeating anything', async () => {
    const { a, b, drive } = twoDevices();
    a.engine.write('tx1', 'Phở');
    a.engine.write('tx2', 'Bún');
    await connected(a);
    await connected(b);
    a.engine.write('tx3', 'Cơm');
    drive.failNext({ status: 401, after: 1 });
    await a.orchestrator.syncNow();
    expect(a.engine.statusNow()).toMatchObject({ state: 'needs_login', pendingEvents: 1 });
    await a.orchestrator.connect();
    await b.orchestrator.syncNow();
    expect(b.engine.visible()).toEqual({ tx1: 'Phở', tx2: 'Bún', tx3: 'Cơm' });
    expect(new Set(b.engine.applied).size).toBe(b.engine.applied.length);
    expect(a.engine.statusNow()).toMatchObject({ state: 'idle', pendingEvents: 0 });
  });

  it('does not repeat the needs-login report while nothing changed', async () => {
    const { a } = twoDevices();
    await connected(a);
    a.auth.expire();
    await a.orchestrator.syncNow();
    const reports = a.engine.calls.filter((call) => call.command === 'sync.report_state').length;
    await a.orchestrator.syncNow();
    expect(a.engine.calls.filter((call) => call.command === 'sync.report_state')).toHaveLength(reports);
  });
});

describe('failures other than login and network', () => {
  it('reports a rate limit as a retryable error and recovers on its own', async () => {
    const { a, drive } = twoDevices();
    await connected(a);
    a.engine.write('tx1', 'Phở');
    drive.failNext(...Array.from({ length: 4 }, () => ({ status: 429 })));
    await a.orchestrator.syncNow();
    expect(a.engine.statusNow()).toMatchObject({ state: 'error', error: 'rate_limited', pendingEvents: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    expect(a.engine.statusNow()).toMatchObject({ state: 'idle', pendingEvents: 0, error: null });
  });

  it('reports a Drive refusal as an error with a reason the screen can explain', async () => {
    const { a, drive } = twoDevices();
    await connected(a);
    drive.failNext({ status: 403, reason: 'insufficientPermissions' });
    a.engine.write('tx1', 'Phở');
    await a.orchestrator.syncNow();
    expect(a.engine.statusNow()).toMatchObject({ state: 'error', error: 'drive' });
  });

  it('finds the folder again when the person deleted it', async () => {
    const { a, drive } = twoDevices();
    a.engine.write('tx1', 'Phở');
    await connected(a);
    drive.deleteFolderWithContent(drive.folderId()!);
    a.engine.write('tx2', 'Bún');
    await a.orchestrator.syncNow();
    expect(a.engine.statusNow().state).toBe('idle');
    expect(drive.filesNamed('Alavo Daily Backup')).toHaveLength(1);
  });
});

describe('when it runs', () => {
  it('syncs about five seconds after a local change, not on every change', async () => {
    const { a, drive } = twoDevices();
    await connected(a);
    const stop = a.orchestrator.start();
    await vi.advanceTimersByTimeAsync(100);
    const before = drive.requests.length;
    a.engine.write('tx1', 'Phở');
    await vi.advanceTimersByTimeAsync(3000);
    a.engine.write('tx2', 'Bún');
    await vi.advanceTimersByTimeAsync(3000);
    expect(drive.requests.length).toBe(before);
    await vi.advanceTimersByTimeAsync(3000);
    expect(a.engine.statusNow().pendingEvents).toBe(0);
    expect(drive.filesNamed(eventFileName('dev-a'))).toHaveLength(1);
    stop();
  });

  it('syncs when the app opens if it was connected before', async () => {
    const { a, b } = twoDevices();
    a.engine.write('tx1', 'Phở');
    await connected(a);
    await connected(b);
    a.engine.write('tx2', 'Bún');
    await a.orchestrator.syncNow();
    const stop = b.orchestrator.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(Object.keys(b.engine.visible()).sort()).toEqual(['tx1', 'tx2']);
    stop();
  });

  it('does not sync on open when sync was never turned on', async () => {
    const { a, drive } = twoDevices();
    const stop = a.orchestrator.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(drive.requests).toHaveLength(0);
    stop();
  });

  it('runs one round at a time and one more after a request that came in meanwhile', async () => {
    const { a, drive } = twoDevices();
    await connected(a);
    a.engine.write('tx1', 'Phở');
    const first = a.orchestrator.syncNow();
    const second = a.orchestrator.syncNow();
    await Promise.all([first, second]);
    await vi.advanceTimersByTimeAsync(10);
    expect(drive.filesNamed(eventFileName('dev-a'))).toHaveLength(1);
    expect(a.engine.statusNow().state).toBe('idle');
  });
});

describe('disconnecting', () => {
  it('stops syncing, signs out of Google and keeps the data on this device', async () => {
    const { a, drive } = twoDevices();
    a.engine.write('tx1', 'Phở');
    await connected(a);
    await a.orchestrator.disconnect();
    expect(a.auth.signOutCalls).toBe(1);
    expect(a.engine.statusNow()).toMatchObject({ state: 'off', accountEmail: null });
    expect(a.engine.visible()).toEqual({ tx1: 'Phở' });
    const requests = drive.requests.length;
    a.engine.write('tx2', 'Bún');
    await a.orchestrator.syncNow();
    expect(drive.requests.length).toBe(requests);
  });
});
