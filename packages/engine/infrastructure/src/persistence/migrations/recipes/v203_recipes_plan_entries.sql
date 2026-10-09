CREATE TABLE IF NOT EXISTS recipes_plan_entries (
    id TEXT PRIMARY KEY NOT NULL,
    planned_on TEXT NOT NULL,
    slot TEXT NOT NULL,
    recipe_id TEXT NOT NULL,
    servings INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recipes_plan_entries_day
    ON recipes_plan_entries (deleted_at, planned_on, slot);

CREATE INDEX IF NOT EXISTS idx_recipes_plan_entries_recipe
    ON recipes_plan_entries (recipe_id, deleted_at);
