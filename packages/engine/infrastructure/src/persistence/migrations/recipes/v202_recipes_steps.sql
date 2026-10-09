CREATE TABLE IF NOT EXISTS recipes_steps (
    id TEXT PRIMARY KEY NOT NULL,
    recipe_id TEXT NOT NULL,
    text TEXT NOT NULL,
    timer_min INTEGER NOT NULL DEFAULT 0,
    position TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recipes_steps_recipe
    ON recipes_steps (recipe_id, deleted_at, position);
