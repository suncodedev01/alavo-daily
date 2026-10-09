import type { Aisle, RecipeLevel } from '@alavo-daily/common/engine';

export interface IngredientDraft {
  key: string;
  quantity: string;
  unit: string;
  name: string;
  aisle: Aisle;
  costVnd: number;
}

export interface StepDraft {
  key: string;
  text: string;
  timerMin: number;
}

export interface Draft {
  name: string;
  tags: string[];
  prepMin: string;
  cookMin: string;
  servings: number;
  level: RecipeLevel;
  icon: string;
  kcal: number | null;
  note: string;
  ingredients: IngredientDraft[];
  steps: StepDraft[];
  imported: boolean;
}

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export type GeneralField = 'name' | 'prepMin' | 'cookMin';

export type DraftAction =
  | { type: 'replace'; draft: Draft }
  | { type: 'set_field'; field: GeneralField; value: string }
  | { type: 'set_servings'; servings: number }
  | { type: 'toggle_tag'; tag: string }
  | { type: 'add_ingredient' }
  | { type: 'edit_ingredient'; key: string; changes: Partial<Omit<IngredientDraft, 'key'>> }
  | { type: 'remove_ingredient'; key: string }
  | { type: 'add_step' }
  | { type: 'edit_step'; key: string; changes: Partial<Omit<StepDraft, 'key'>> }
  | { type: 'toggle_timer'; key: string }
  | { type: 'move_step'; key: string; by: -1 | 1 }
  | { type: 'remove_step'; key: string };

export interface RecipeImport {
  busy: boolean;
  error: string | null;
  fromJson: (json: string) => Promise<void>;
  fromUrl: (url: string) => Promise<void>;
}

export interface SaveRecipe {
  saving: boolean;
  error: string | null;
  submit: (draft: Draft) => void;
}
