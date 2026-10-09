CREATE TABLE IF NOT EXISTS recipes_shopping_items (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    aisle TEXT NOT NULL DEFAULT 'other',
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recipes_shopping_items_active
    ON recipes_shopping_items (deleted_at);
