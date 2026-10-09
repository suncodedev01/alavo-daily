import { DriveHttp, type DriveHttpOptions } from './driveHttp';
import { deviceIdOfFile, eventFileName } from './eventFile';

export const FOLDER_NAME = 'Alavo Daily Backup';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const PAGE_SIZE = 100;

/** A device's event file on Drive. `marker` changes whenever the file's content does. */
export interface DriveEventFile {
  id: string;
  deviceId: string;
  marker: string;
}

interface RawFile {
  id: string;
  name?: string;
  md5Checksum?: string;
  modifiedTime?: string;
  size?: string;
  createdTime?: string;
}

interface FileList {
  files?: RawFile[];
  nextPageToken?: string;
}

/**
 * What sync needs from Google Drive, with the `drive.file` scope only: the app sees just the
 * files it made itself, in one visible folder of My Drive.
 */
export class DriveClient {
  private readonly http: DriveHttp;

  constructor(options: DriveHttpOptions) {
    this.http = new DriveHttp(options);
  }

  /** Finds the backup folder or creates it. When two devices create one at once, the oldest wins. */
  async ensureFolder(): Promise<string> {
    const existing = await this.findFolders();
    if (existing[0]) return existing[0].id;
    const created = await this.createFolder();
    const oldest = (await this.findFolders())[0]?.id ?? created;
    if (oldest !== created) await this.discard(created);
    return oldest;
  }

  async listEventFiles(folderId: string): Promise<DriveEventFile[]> {
    const raw = await this.listAll({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken,files(id,name,md5Checksum,modifiedTime,size)',
    });
    return newestPerDevice(raw);
  }

  download(fileId: string): Promise<string> {
    return this.http.text(`${API}/files/${fileId}?alt=media`);
  }

  /** Creates the device's file, or replaces its content when `existingId` is given. */
  async saveEventFile(
    folderId: string,
    deviceId: string,
    existingId: string | null,
    content: string,
  ): Promise<string> {
    const metadata = existingId
      ? {}
      : { name: eventFileName(deviceId), parents: [folderId], mimeType: 'application/json' };
    const { body, contentType } = multipartBody(metadata, content);
    const url = existingId
      ? `${UPLOAD_API}/files/${existingId}?uploadType=multipart&fields=id`
      : `${UPLOAD_API}/files?uploadType=multipart&fields=id`;
    const saved = await this.http.json<{ id: string }>(url, {
      method: existingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });
    return saved.id;
  }

  /** The signed-in account, for showing which Google account is connected. */
  async accountEmail(): Promise<string | null> {
    const about = await this.http.json<{ user?: { emailAddress?: string } }>(
      `${API}/about?fields=user(emailAddress)`,
    );
    return about.user?.emailAddress ?? null;
  }

  private async findFolders(): Promise<RawFile[]> {
    const q = `mimeType='${FOLDER_MIME}' and name='${FOLDER_NAME}' and 'root' in parents and trashed=false`;
    const folders = await this.listAll({ q, fields: 'nextPageToken,files(id,createdTime)' });
    return folders.sort(
      (a, b) =>
        (a.createdTime ?? '').localeCompare(b.createdTime ?? '') || a.id.localeCompare(b.id),
    );
  }

  private async createFolder(): Promise<string> {
    const created = await this.http.json<{ id: string }>(`${API}/files?fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME, parents: ['root'] }),
    });
    return created.id;
  }

  private async discard(fileId: string): Promise<void> {
    await this.http.request(`${API}/files/${fileId}`, { method: 'DELETE' }).catch(() => undefined);
  }

  private async listAll(query: { q: string; fields: string }): Promise<RawFile[]> {
    const files: RawFile[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({ ...query, pageSize: String(PAGE_SIZE) });
      if (pageToken) params.set('pageToken', pageToken);
      const page = await this.http.json<FileList>(`${API}/files?${params.toString()}`);
      files.push(...(page.files ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken);
    return files;
  }
}

function newestPerDevice(files: RawFile[]): DriveEventFile[] {
  const byDevice = new Map<string, RawFile>();
  for (const file of files) {
    const deviceId = deviceIdOfFile(file.name ?? '');
    const kept = deviceId ? byDevice.get(deviceId) : undefined;
    if (deviceId && (!kept || (file.modifiedTime ?? '') > (kept.modifiedTime ?? ''))) {
      byDevice.set(deviceId, file);
    }
  }
  return [...byDevice].map(([deviceId, file]) => ({ id: file.id, deviceId, marker: markerOf(file) }));
}

function markerOf(file: RawFile): string {
  return file.md5Checksum ?? `${file.modifiedTime ?? ''}:${file.size ?? ''}`;
}

function multipartBody(metadata: object, content: string): { body: string; contentType: string } {
  let boundary = `alavo-${Date.now().toString(36)}`;
  while (content.includes(boundary)) boundary += 'x';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}
