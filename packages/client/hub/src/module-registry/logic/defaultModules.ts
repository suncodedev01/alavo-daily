import type { ModuleManifest } from '@alavo-daily/common';
import { recipesManifest } from '@alavo-daily/recipes';
import { spendingManifest } from '@alavo-daily/spending';

export const DEFAULT_MODULES: readonly ModuleManifest[] = [spendingManifest, recipesManifest];
