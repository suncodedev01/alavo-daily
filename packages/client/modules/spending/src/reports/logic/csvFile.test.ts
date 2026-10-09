import { describe, expect, it } from 'vitest';

import { csvFilename, withByteOrderMark } from './csvFile';

describe('csv file', () => {
  it('names the file after the exported range', () => {
    expect(csvFilename({ from: '2026-10-01', to: '2026-10-09' })).toBe('alavo-giao-dich-2026-10-01_2026-10-09.csv');
  });

  it('starts the content with a byte order mark and leaves the rest unchanged', () => {
    const content = withByteOrderMark('date,title\r\n');
    expect(content.charCodeAt(0)).toBe(0xfeff);
    expect(content.slice(1)).toBe('date,title\r\n');
  });
});
