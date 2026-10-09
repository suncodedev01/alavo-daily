import { EngineCallError } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import { describeEngineError } from './engineMessage';
import type { Translate } from '../types';

const t: Translate = (key, values) =>
  key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values?.[name] ?? ''));

const validation = (message: string) => new EngineCallError('validation', message);

describe('describeEngineError', () => {
  it('explains a missing name in Vietnamese', () => {
    expect(describeEngineError(validation('recipe name must not be empty'), t)).toBe('Công thức cần có tên.');
  });

  it('puts the ingredient name into the sentence', () => {
    expect(describeEngineError(validation('quantity of Gừng must be above 0'), t)).toBe(
      'Số lượng của Gừng phải lớn hơn 0.',
    );
  });

  it('explains the empty expense', () => {
    const message = 'nothing with an estimated cost is left to buy';
    expect(describeEngineError(validation(message), t)).toContain('Chi tiêu');
  });

  it('says the data is gone for not_found', () => {
    expect(describeEngineError(new EngineCallError('not_found', 'recipe x'), t)).toContain('Không tìm thấy');
  });

  it('falls back for unknown messages and non engine errors', () => {
    expect(describeEngineError(validation('something new'), t)).toContain('Không thực hiện được');
    expect(describeEngineError(new Error('boom'), t)).toContain('Không thực hiện được');
  });
});
