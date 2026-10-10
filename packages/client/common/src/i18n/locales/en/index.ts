import { EN_ESTIMATES } from './estimates';
import { EN_HUB } from './hub';
import { EN_RECIPES } from './recipes';
import { EN_SHARED } from './shared';
import { EN_SPENDING } from './spending';

export const EN_TRANSLATIONS: Record<string, string> = {
  ...EN_SHARED,
  ...EN_HUB,
  ...EN_SPENDING,
  ...EN_ESTIMATES,
  ...EN_RECIPES,
};
