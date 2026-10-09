import { describe, expect, it } from 'vitest';

import { decodeStatement } from './decodeStatement';

function bytesOf(values: number[]): ArrayBuffer {
  return new Uint8Array(values).buffer;
}

describe('decodeStatement', () => {
  it('reads UTF-8 text with Vietnamese letters', () => {
    const encoded = new TextEncoder().encode('Số tiền;Nội dung');
    expect(decodeStatement(encoded.buffer as ArrayBuffer)).toBe('Số tiền;Nội dung');
  });

  it('falls back to the Windows code page when the bytes are not valid UTF-8', () => {
    expect(decodeStatement(bytesOf([0x4e, 0xe3, 0x69]))).toHaveLength(3);
  });

  it('keeps a byte order mark for the engine to strip', () => {
    const encoded = new TextEncoder().encode('﻿Date');
    expect(decodeStatement(encoded.buffer as ArrayBuffer).endsWith('Date')).toBe(true);
  });
});
