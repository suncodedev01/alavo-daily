import type { Ingredient, Recipe, RecipeSummary, Step } from '@alavo-daily/common/engine';

export const TODAY = '2026-10-09';
export const THIS_WEEK = '2026-10-05';

export function ingredient(id: string, overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id,
    name: id,
    quantity: 1,
    unit: 'g',
    aisle: 'other',
    costVnd: 0,
    position: id,
    ...overrides,
  };
}

export function step(id: string, text: string, timerMin = 0): Step {
  return { id, text, timerMin, position: id };
}

export function recipe(overrides: Partial<Recipe> & Pick<Recipe, 'id' | 'name'>): Recipe {
  const ingredients = overrides.ingredients ?? [];
  return {
    tags: ['Món chính'],
    prepMin: 10,
    cookMin: 20,
    servings: 4,
    level: 'easy',
    favorite: false,
    icon: 'cooking-pot',
    costVnd: ingredients.reduce((sum, item) => sum + item.costVnd, 0),
    ingredientCount: ingredients.length,
    kcal: null,
    note: '',
    ingredients,
    steps: [],
    photo: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

export const GA_KHO = recipe({
  id: 'ga-kho',
  name: 'Gà kho gừng',
  favorite: true,
  prepMin: 15,
  cookMin: 40,
  kcal: 420,
  ingredients: [
    ingredient('dui-ga', { name: 'Đùi gà', quantity: 600, unit: 'g', aisle: 'meat_fish', costVnd: 54000 }),
    ingredient('gung', { name: 'Gừng', quantity: 50, unit: 'g', aisle: 'vegetables', costVnd: 4000 }),
    ingredient('nuoc-mam', { name: 'Nước mắm', quantity: 2, unit: 'muỗng canh', aisle: 'spices', costVnd: 3000 }),
  ],
  steps: [
    step('s1', 'Rửa gà, chặt miếng vừa ăn rồi ướp.', 15),
    step('s2', 'Phi thơm hành và gừng, cho gà vào xào săn.', 5),
    step('s3', 'Thêm nước xâm xấp, hạ lửa nhỏ.'),
  ],
});

export const CANH_CHUA = recipe({
  id: 'canh-chua',
  name: 'Canh chua cá lóc',
  tags: ['Canh'],
  prepMin: 20,
  cookMin: 20,
  ingredients: [
    ingredient('ca-loc', { name: 'Cá lóc', quantity: 500, unit: 'g', aisle: 'meat_fish', costVnd: 75000 }),
    ingredient('ca-chua', { name: 'Cà chua', quantity: 3, unit: 'quả', aisle: 'vegetables', costVnd: 12000 }),
  ],
  steps: [step('c1', 'Làm sạch cá, cắt khúc.'), step('c2', 'Nấu nước me, thả cá vào.', 8)],
});

export const RAU_MUONG = recipe({
  id: 'rau-muong',
  name: 'Rau muống xào tỏi',
  tags: ['Rau', 'Nhanh'],
  servings: 2,
  prepMin: 5,
  cookMin: 5,
  ingredients: [ingredient('rau', { name: 'Rau muống', quantity: 1, unit: 'bó', aisle: 'vegetables', costVnd: 10000 })],
  steps: [step('r1', 'Nhặt và rửa rau.'), step('r2', 'Xào lửa lớn.', 3)],
});

export const ALL_RECIPES: Recipe[] = [GA_KHO, CANH_CHUA, RAU_MUONG];

export function summaryOf(source: Recipe): RecipeSummary {
  return {
    id: source.id,
    name: source.name,
    tags: source.tags,
    prepMin: source.prepMin,
    cookMin: source.cookMin,
    servings: source.servings,
    level: source.level,
    favorite: source.favorite,
    icon: source.icon,
    costVnd: source.costVnd,
    ingredientCount: source.ingredients.length,
  };
}
