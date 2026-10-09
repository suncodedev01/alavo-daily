import type { FetchLike } from '../driveHttp';

interface StoredFile {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  content: string;
  createdTime: string;
  modifiedTime: string;
  trashed: boolean;
}

export interface InjectedFailure {
  status: number;
  reason?: string;
  headers?: Record<string, string>;
  /** Lets this many requests through first, to fail one in the middle of a sync. */
  after?: number;
}

const FOLDER_MIME = 'application/vnd.google-apps.folder';

/** An in-memory Google Drive that answers the requests the sync client makes. */
export class FakeDrive {
  readonly files = new Map<string, StoredFile>();
  readonly requests: { method: string; path: string }[] = [];
  offline = false;
  pageSize = 100;
  accounts = new Set(['token-1']);
  email = 'person@example.com';
  private failures: InjectedFailure[] = [];
  private clock = 0;
  private nextId = 1;

  readonly fetch: FetchLike = async (input, init = {}) => {
    if (this.offline) throw new TypeError('Failed to fetch');
    const url = new URL(input);
    const method = init.method ?? 'GET';
    this.requests.push({ method, path: url.pathname });
    const token = (init.headers as Record<string, string> | undefined)?.Authorization?.replace('Bearer ', '');
    if (!token || !this.accounts.has(token)) return reply(401, { error: { message: 'Invalid Credentials' } });
    const failure = this.nextFailure();
    return failure ? failWith(failure) : this.route(method, url, init);
  };

  private nextFailure(): InjectedFailure | undefined {
    const waiting = this.failures[0];
    if (!waiting) return undefined;
    if ((waiting.after ?? 0) > 0) {
      waiting.after = (waiting.after ?? 0) - 1;
      return undefined;
    }
    return this.failures.shift();
  }

  failNext(...failures: InjectedFailure[]): void {
    this.failures.push(...failures);
  }

  requestsTo(method: string, pathPart: string): number {
    return this.requests.filter((request) => request.method === method && request.path.includes(pathPart)).length;
  }

  filesNamed(name: string): StoredFile[] {
    return [...this.files.values()].filter((file) => file.name === name && !file.trashed);
  }

  folderId(): string | undefined {
    return [...this.files.values()].find((file) => file.mimeType === FOLDER_MIME)?.id;
  }

  deleteFolderWithContent(folderId: string): void {
    for (const file of [...this.files.values()]) {
      if (file.parents.includes(folderId)) this.files.delete(file.id);
    }
    this.files.delete(folderId);
  }

  put(file: Partial<StoredFile> & { name: string; content?: string }): StoredFile {
    const stored: StoredFile = {
      id: `file-${this.nextId++}`,
      mimeType: file.mimeType ?? 'application/json',
      parents: file.parents ?? [],
      content: file.content ?? '',
      createdTime: this.tick(),
      modifiedTime: this.tick(),
      trashed: false,
      ...file,
    };
    this.files.set(stored.id, stored);
    return stored;
  }

  private route(method: string, url: URL, init: RequestInit): Response {
    const path = url.pathname.replace('/upload', '');
    const id = /\/files\/([^/]+)$/.exec(path)?.[1];
    if (path.endsWith('/about')) return reply(200, { user: { emailAddress: this.email } });
    if (url.pathname.startsWith('/upload')) return this.upload(method, id, init);
    if (method === 'GET' && id && url.searchParams.get('alt') === 'media') return this.download(id);
    if (method === 'DELETE' && id) return this.remove(id);
    if (method === 'POST') return this.createFromMetadata(JSON.parse(String(init.body)) as Partial<StoredFile>);
    return this.list(url);
  }

  private list(url: URL): Response {
    const matching = [...this.files.values()].filter((file) => matches(file, url.searchParams.get('q') ?? ''));
    const start = Number(url.searchParams.get('pageToken') ?? 0);
    const page = matching.slice(start, start + this.pageSize);
    const next = start + this.pageSize < matching.length ? String(start + this.pageSize) : undefined;
    return reply(200, { files: page.map(describe), nextPageToken: next });
  }

  private download(id: string): Response {
    const file = this.files.get(id);
    return file ? new Response(file.content, { status: 200 }) : reply(404, { error: { message: 'File not found' } });
  }

  private remove(id: string): Response {
    this.files.delete(id);
    return new Response(null, { status: 204 });
  }

  private createFromMetadata(metadata: Partial<StoredFile>): Response {
    const stored = this.put({ name: metadata.name ?? 'untitled', mimeType: metadata.mimeType, parents: metadata.parents });
    return reply(200, { id: stored.id });
  }

  private upload(method: string, id: string | undefined, init: RequestInit): Response {
    const { metadata, content } = parseMultipart(String((init.headers as Record<string, string>)['Content-Type']), String(init.body));
    if (method === 'PATCH' && id) {
      const file = this.files.get(id);
      if (!file) return reply(404, { error: { message: 'File not found' } });
      Object.assign(file, { content, modifiedTime: this.tick() });
      return reply(200, { id });
    }
    const parents = metadata.parents as string[];
    if (parents.some((parent) => !this.files.has(parent))) {
      return reply(404, { error: { message: 'File not found: parent' } });
    }
    const stored = this.put({ name: String(metadata.name), parents, content });
    return reply(200, { id: stored.id });
  }

  private tick(): string {
    this.clock += 1;
    return new Date(1_800_000_000_000 + this.clock * 1000).toISOString();
  }
}

function describe(file: StoredFile): Record<string, unknown> {
  return {
    id: file.id,
    name: file.name,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    size: String(file.content.length),
    md5Checksum: file.mimeType === FOLDER_MIME ? undefined : checksum(file.content),
  };
}

function matches(file: StoredFile, query: string): boolean {
  return query.split(' and ').every((clause) => {
    const parent = /^'([^']+)' in parents$/.exec(clause);
    if (parent) return file.parents.includes(parent[1]!);
    const field = /^(\w+)='([^']*)'$/.exec(clause);
    if (field) return (file as unknown as Record<string, string>)[field[1]!] === field[2];
    return clause !== 'trashed=false' || !file.trashed;
  });
}

function parseMultipart(contentType: string, body: string): { metadata: Record<string, unknown>; content: string } {
  const boundary = /boundary=(.+)$/.exec(contentType)?.[1] ?? '';
  const parts = body.split(`--${boundary}`).filter((part) => part.trim() !== '' && part.trim() !== '--');
  const bodyOf = (part: string) => part.split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, '');
  return { metadata: JSON.parse(bodyOf(parts[0] ?? '{}')) as Record<string, unknown>, content: bodyOf(parts[1] ?? '') };
}

function checksum(content: string): string {
  let hash = 5381;
  for (const char of content) hash = (hash * 33) ^ char.charCodeAt(0);
  return `md5-${(hash >>> 0).toString(16)}-${content.length}`;
}

function failWith(failure: InjectedFailure): Response {
  const errors = failure.reason ? [{ reason: failure.reason }] : [];
  return new Response(JSON.stringify({ error: { errors } }), { status: failure.status, headers: failure.headers });
}

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
