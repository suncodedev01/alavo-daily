import { describe, expect, it } from 'vitest';

import { blankDraft } from './draft';
import type { Draft } from '../types';
import { draftReducer, moveRow } from './draftReducer';

function draftWithSteps(texts: string[]): Draft {
  const draft = blankDraft();
  return {
    ...draft,
    steps: texts.map((text, index) => ({ key: `s${index}`, text, timerMin: 0 })),
  };
}

const texts = (draft: Draft) => draft.steps.map((step) => step.text);

describe('draftReducer fields', () => {
  it('sets a general field', () => {
    expect(draftReducer(blankDraft(), { type: 'set_field', field: 'name', value: 'Canh' }).name).toBe('Canh');
  });

  it('keeps servings between 1 and 50', () => {
    expect(draftReducer(blankDraft(), { type: 'set_servings', servings: 0 }).servings).toBe(1);
    expect(draftReducer(blankDraft(), { type: 'set_servings', servings: 80 }).servings).toBe(50);
  });

  it('toggles a tag on and off', () => {
    const added = draftReducer(blankDraft(), { type: 'toggle_tag', tag: 'Canh' });
    expect(added.tags).toEqual(['Món chính', 'Canh']);
    expect(draftReducer(added, { type: 'toggle_tag', tag: 'Canh' }).tags).toEqual(['Món chính']);
  });
});

describe('draftReducer ingredients', () => {
  it('adds, edits and removes a row', () => {
    let draft = draftReducer(blankDraft(), { type: 'add_ingredient' });
    expect(draft.ingredients).toHaveLength(2);
    const key = draft.ingredients[1]!.key;
    draft = draftReducer(draft, { type: 'edit_ingredient', key, changes: { name: 'Tỏi', unit: 'tép' } });
    expect(draft.ingredients[1]).toMatchObject({ name: 'Tỏi', unit: 'tép' });
    draft = draftReducer(draft, { type: 'remove_ingredient', key });
    expect(draft.ingredients).toHaveLength(1);
  });

  it('leaves one blank row when the last one is removed', () => {
    const draft = blankDraft();
    const emptied = draftReducer(draft, { type: 'remove_ingredient', key: draft.ingredients[0]!.key });
    expect(emptied.ingredients).toHaveLength(1);
    expect(emptied.ingredients[0]!.key).not.toBe(draft.ingredients[0]!.key);
  });
});

describe('draftReducer steps', () => {
  it('moves a step up and down', () => {
    const draft = draftWithSteps(['a', 'b', 'c']);
    expect(texts(draftReducer(draft, { type: 'move_step', key: 's2', by: -1 }))).toEqual(['a', 'c', 'b']);
    expect(texts(draftReducer(draft, { type: 'move_step', key: 's0', by: 1 }))).toEqual(['b', 'a', 'c']);
  });

  it('does not move past either end', () => {
    const draft = draftWithSteps(['a', 'b']);
    expect(texts(draftReducer(draft, { type: 'move_step', key: 's0', by: -1 }))).toEqual(['a', 'b']);
    expect(texts(draftReducer(draft, { type: 'move_step', key: 's1', by: 1 }))).toEqual(['a', 'b']);
  });

  it('toggles a timer between none and ten minutes', () => {
    const draft = draftWithSteps(['a']);
    const on = draftReducer(draft, { type: 'toggle_timer', key: 's0' });
    expect(on.steps[0]!.timerMin).toBe(10);
    expect(draftReducer(on, { type: 'toggle_timer', key: 's0' }).steps[0]!.timerMin).toBe(0);
  });

  it('removes a step', () => {
    const draft = draftWithSteps(['a', 'b']);
    expect(texts(draftReducer(draft, { type: 'remove_step', key: 's0' }))).toEqual(['b']);
  });

  it('replaces the whole draft', () => {
    const next = draftWithSteps(['x']);
    expect(draftReducer(blankDraft(), { type: 'replace', draft: next })).toBe(next);
  });
});

describe('moveRow', () => {
  it('returns the same list for an unknown key', () => {
    const rows = [{ key: 'a' }];
    expect(moveRow(rows, 'zzz', 1)).toBe(rows);
  });
});
