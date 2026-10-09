import type { Translate } from '../engine-errors';

/** A stand-in for `t` in pure-logic tests: the Vietnamese key with its `{{values}}` filled in. */
export const plainTranslate: Translate = (key, values = {}) =>
  key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name] ?? ''));
