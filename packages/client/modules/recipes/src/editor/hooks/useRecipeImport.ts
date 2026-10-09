import { EngineCallError, useEngineMutation, type RecipeInput } from '@alavo-daily/common/engine';
import { usePlatform, useT } from '@alavo-daily/common';
import { useState } from 'react';

import { describeEngineError } from '../../engine-errors';
import { draftFromInput } from '../logic/draft';
import { InvalidAddress, PageUnreachable, readRecipeFromPage } from '../logic/pageImport';
import type { Draft } from '../types';
import type { RecipeImport } from '../types';

const NO_RECIPE_ON_PAGE = 'Trang này không có công thức mà ứng dụng đọc được. Bạn thử dán JSON-LD hoặc nhập tay nhé.';
const NO_RECIPE_IN_TEXT = 'Không thấy công thức trong nội dung này.';

export function useRecipeImport(onFill: (draft: Draft) => void): RecipeImport {
  const t = useT();
  const { fetchPage } = usePlatform();
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
    fromJson: (json) => attempt(() => parseJson(json), NO_RECIPE_IN_TEXT),
    fromUrl: (url) => attempt(() => readRecipeFromPage(url, fetchPage, parseJson), NO_RECIPE_ON_PAGE),
  };
}

function explain(failure: unknown, t: ReturnType<typeof useT>): string {
  if (failure instanceof InvalidAddress) {
    return t('Đường dẫn này chưa đúng. Bạn dán địa chỉ đầy đủ của trang công thức nhé.');
  }
  if (failure instanceof PageUnreachable) {
    return t('Không tải được trang này. Bạn kiểm tra kết nối mạng rồi thử lại nhé.');
  }
  if (failure instanceof EngineCallError && failure.code === 'validation') {
    return t('Nội dung này không phải JSON hợp lệ.');
  }
  if (failure instanceof EngineCallError) return describeEngineError(failure, t);
  return t('Không đọc được trang này. Bạn thử dán JSON-LD hoặc nhập tay nhé.');
}
