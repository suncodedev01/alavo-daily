import { afterEach, describe, expect, it, vi } from 'vitest';

import { readFileBytes } from './readFileBytes';

afterEach(() => vi.unstubAllGlobals());

describe('readFileBytes', () => {
  it('returns the bytes of the file', async () => {
    const bytes = await readFileBytes(new File(['Số tiền'], 'a.csv'));
    expect(new TextDecoder().decode(bytes)).toBe('Số tiền');
  });

  it('rejects when the file cannot be read', async () => {
    class FailingReader {
      error = new Error('unreadable');
      onerror: (() => void) | null = null;
      readAsArrayBuffer(): void {
        this.onerror?.();
      }
    }
    vi.stubGlobal('FileReader', FailingReader);
    await expect(readFileBytes(new File(['x'], 'a.csv'))).rejects.toThrow('unreadable');
  });
});
