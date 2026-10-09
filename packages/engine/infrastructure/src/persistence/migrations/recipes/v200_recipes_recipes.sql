CREATE TABLE IF NOT EXISTS recipes_recipes (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    prep_min INTEGER NOT NULL DEFAULT 0,
    cook_min INTEGER NOT NULL DEFAULT 0,
    servings INTEGER NOT NULL,
    level TEXT NOT NULL DEFAULT 'medium',
    favorite INTEGER NOT NULL DEFAULT 0,
    icon TEXT NOT NULL DEFAULT 'cooking-pot',
    kcal INTEGER,
    note TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    field_updated_at TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_recipes_recipes_active
    ON recipes_recipes (deleted_at, name);
