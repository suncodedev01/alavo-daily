import { EngineCallError, useEngineMutation, type RecipeInput } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { useState } from 'react';

import { describeEngineError } from '../../engine-errors';
import { draftFromInput } from '../logic/draft';
import type { Draft } from '../types';
import { extractJsonLdBlocks } from '../logic/jsonLd';
import type { RecipeImport } from '../types';

const NO_RECIPE_ON_PAGE = 'Trang này không có công thức mà ứng dụng đọc được.';

export function useRecipeImport(onFill: (draft: Draft) => void): RecipeImport {
  const t = useT();
  const parse = useEngineMutation('recipes.parse_json_ld');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attempt = async (job: () => Promise<RecipeInput | null>, missing: string) => {
    setBusy(true);
    setError(null);
    try {
      const found = await job();
      if (found === null) setError(t(missing));
      else onFill(draftFromInput(found, true));
    } catch (failure) {
      setError(explain(failure, t));
    } finally {
      setBusy(false);
    }
  };

  const parseJson = (json: string) => parse.mutateAsync({ json });
  return {
    busy,
    error,
    fromJson: (json) => attempt(() => parseJson(json), 'Không thấy công thức trong nội dung này.'),
    fromUrl: (url) => attempt(() => readFirstRecipe(url, parseJson), NO_RECIPE_ON_PAGE),
  };
}

async function readFirstRecipe(
  url: string,
  parseJson: (json: string) => Promise<RecipeInput | null>,
): Promise<RecipeInput | null> {
  const response = await fetch(url);
  if (!response.ok) throw new PageUnreadable();
  for (const block of extractJsonLdBlocks(await response.text())) {
    const recipe = await parseJson(block).catch(() => null);
    if (recipe !== null) return recipe;
  }
  return null;
}

class PageUnreadable extends Error {}

function explain(failure: unknown, t: ReturnType<typeof useT>): string {
  if (failure instanceof EngineCallError && failure.code === 'validation') {
    return t('Nội dung này không phải JSON hợp lệ.');
  }
  if (failure instanceof EngineCallError) return describeEngineError(failure, t);
  return t('Không đọc được trang này. Bạn thử dán JSON-LD hoặc nhập tay nhé.');
}
