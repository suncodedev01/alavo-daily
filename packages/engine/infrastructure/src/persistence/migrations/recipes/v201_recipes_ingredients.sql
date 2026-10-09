CREATE TABLE IF NOT EXISTS recipes_ingredients (
    id TEXT PRIMARY KEY NOT NULL,
    recipe_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    aisle TEXT NOT NULL DEFAULT 'other',
    cost_vnd INTEGER NOT NULL DEFAULT 0,
    position TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recipes_ingredients_recipe
    ON recipes_ingredients (recipe_id, deleted_at, position);
