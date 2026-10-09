import { describe, expect, it } from 'vitest';

import { shoppingRange } from './shoppingRange';

describe('shoppingRange', () => {
  it('runs from today to the end of the shown week', () => {
    expect(shoppingRange('2026-10-05', '2026-10-09')).toEqual({ from: '2026-10-09', to: '2026-10-11' });
  });

  it('starts today for a later week too', () => {
    expect(shoppingRange('2026-10-12', '2026-10-09')).toEqual({ from: '2026-10-09', to: '2026-10-18' });
  });

  it('shows the whole week when it is already over', () => {
    expect(shoppingRange('2026-09-28', '2026-10-09')).toEqual({ from: '2026-09-28', to: '2026-10-04' });
  });
});
