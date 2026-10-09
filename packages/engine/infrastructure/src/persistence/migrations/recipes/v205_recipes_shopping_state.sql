CREATE TABLE IF NOT EXISTS recipes_shopping_state (
    id TEXT PRIMARY KEY NOT NULL,
    have INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);
