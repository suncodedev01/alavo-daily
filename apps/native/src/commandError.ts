export class NativeCommandError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'NativeCommandError';
  }
}

interface SerializedCommandError {
  code: string;
  message: string;
}

function isSerializedCommandError(value: unknown): value is SerializedCommandError {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}

export function toCommandError(rejection: unknown): Error {
  if (isSerializedCommandError(rejection)) return new NativeCommandError(rejection.code, rejection.message);
  if (rejection instanceof Error) return rejection;
  return new NativeCommandError('unknown', String(rejection));
}

export async function callCommand<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (rejection) {
    throw toCommandError(rejection);
  }
}
