import { describe, expect, it } from 'vitest';

import { DriveClient, FOLDER_NAME } from './driveClient';
import { SyncError } from './syncError';
import { FakeDrive } from './testing/fakeDrive';

function clientFor(drive: FakeDrive, token: string | null = 'token-1') {
  const slept: number[] = [];
  const client = new DriveClient({
    fetch: drive.fetch,
    accessToken: async () => token,
    sleep: async (ms) => void slept.push(ms),
  });
  return { client, slept };
}

async function failure(work: Promise<unknown>): Promise<SyncError> {
  return work.then(
    () => {
      throw new Error('expected a failure');
    },
    (error: unknown) => error as SyncError,
  );
}

describe('the backup folder', () => {
  it('creates a visible folder named Alavo Daily Backup in My Drive when there is none', async () => {
    const drive = new FakeDrive();
    const { client } = clientFor(drive);
    const id = await client.ensureFolder();
    const folder = drive.files.get(id)!;
    expect(folder.name).toBe(FOLDER_NAME);
    expect(folder.parents).toEqual(['root']);
  });

  it('reuses the folder it already made', async () => {
    const drive = new FakeDrive();
    const { client } = clientFor(drive);
    const first = await client.ensureFolder();
    expect(await client.ensureFolder()).toBe(first);
    expect([...drive.files.values()].filter((file) => file.name === FOLDER_NAME)).toHaveLength(1);
  });

  it('keeps the oldest folder when two devices created one at the same time', async () => {
    const drive = new FakeDrive();
    const older = drive.put({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder', parents: ['root'] });
    const newer = drive.put({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder', parents: ['root'] });
    const { client } = clientFor(drive);
    expect(await client.ensureFolder()).toBe(older.id);
    expect(drive.files.has(newer.id)).toBe(true);
  });
});

describe('event files', () => {
  it('lists only files named events-<device>.json, following pages', async () => {
    const drive = new FakeDrive();
    drive.pageSize = 2;
    const { client } = clientFor(drive);
    const folder = await client.ensureFolder();
    for (const name of ['events-a.json', 'events-b.json', 'events-c.json', 'notes.txt', 'events-d.json']) {
      drive.put({ name, parents: [folder], content: '{}' });
    }
    drive.put({ name: 'events-z.json', parents: ['somewhere-else'] });
    const files = await client.listEventFiles(folder);
    expect(files.map((file) => file.deviceId).sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(drive.requestsTo('GET', '/files')).toBeGreaterThan(3);
  });

  it('gives a file a new marker whenever its content changes', async () => {
    const drive = new FakeDrive();
    const { client } = clientFor(drive);
    const folder = await client.ensureFolder();
    const id = await client.saveEventFile(folder, 'a', null, '{"v":1}');
    const before = (await client.listEventFiles(folder))[0]!.marker;
    await client.saveEventFile(folder, 'a', id, '{"v":2}');
    const after = (await client.listEventFiles(folder))[0]!;
    expect(after.marker).not.toBe(before);
    expect(await client.download(after.id)).toBe('{"v":2}');
  });

  it('creates the file once and then updates the same file', async () => {
    const drive = new FakeDrive();
    const { client } = clientFor(drive);
    const folder = await client.ensureFolder();
    const id = await client.saveEventFile(folder, 'a', null, 'one');
    expect(await client.saveEventFile(folder, 'a', id, 'two')).toBe(id);
    expect(drive.filesNamed('events-a.json')).toHaveLength(1);
    expect(drive.files.get(id)!.parents).toEqual([folder]);
  });

  it('carries multi-line and non-ASCII content through the multipart upload unchanged', async () => {
    const drive = new FakeDrive();
    const { client } = clientFor(drive);
    const folder = await client.ensureFolder();
    const content = JSON.stringify({ note: 'Gà kho\r\n--giữa--', lines: ['a', 'b'] });
    const id = await client.saveEventFile(folder, 'a', null, content);
    expect(await client.download(id)).toBe(content);
  });

  it('reads the account email from Drive', async () => {
    const drive = new FakeDrive();
    expect(await clientFor(drive).client.accountEmail()).toBe('person@example.com');
  });
});

describe('failures', () => {
  it('reports a 401 as needing a new sign-in', async () => {
    const drive = new FakeDrive();
    drive.failNext({ status: 401 });
    const error = await failure(clientFor(drive).client.ensureFolder());
    expect(error.kind).toBe('needs_login');
  });

  it('reports a missing token as needing a new sign-in without calling Drive', async () => {
    const drive = new FakeDrive();
    const error = await failure(clientFor(drive, null).client.ensureFolder());
    expect(error.kind).toBe('needs_login');
    expect(drive.requests).toHaveLength(0);
  });

  it('reports a network failure as offline', async () => {
    const drive = new FakeDrive();
    drive.offline = true;
    expect((await failure(clientFor(drive).client.ensureFolder())).kind).toBe('offline');
  });

  it('retries a rate limit with a growing pause and then succeeds', async () => {
    const drive = new FakeDrive();
    drive.failNext({ status: 429 }, { status: 403, reason: 'userRateLimitExceeded' });
    const { client, slept } = clientFor(drive);
    await client.ensureFolder();
    expect(slept).toEqual([500, 1000]);
  });

  it('honours Retry-After', async () => {
    const drive = new FakeDrive();
    drive.failNext({ status: 429, headers: { 'Retry-After': '3' } });
    const { client, slept } = clientFor(drive);
    await client.ensureFolder();
    expect(slept).toEqual([3000]);
  });

  it('gives up after a few attempts and says it was rate limited', async () => {
    const drive = new FakeDrive();
    drive.failNext(...Array.from({ length: 10 }, () => ({ status: 429 })));
    const { client, slept } = clientFor(drive);
    const error = await failure(client.ensureFolder());
    expect(error.kind).toBe('rate_limited');
    expect(slept).toHaveLength(3);
  });

  it('does not retry a plain 403 such as a missing permission', async () => {
    const drive = new FakeDrive();
    drive.failNext({ status: 403, reason: 'insufficientPermissions' });
    const { client, slept } = clientFor(drive);
    const error = await failure(client.ensureFolder());
    expect([error.kind, slept]).toEqual(['drive', []]);
  });

  it('retries a server error', async () => {
    const drive = new FakeDrive();
    drive.failNext({ status: 503 });
    const { client, slept } = clientFor(drive);
    await client.ensureFolder();
    expect(slept).toEqual([500]);
  });

  it('reports a missing file with its status', async () => {
    const drive = new FakeDrive();
    const error = await failure(clientFor(drive).client.download('nope'));
    expect([error.kind, error.status]).toEqual(['drive', 404]);
  });
});
