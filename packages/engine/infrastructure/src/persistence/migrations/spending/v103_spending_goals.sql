CREATE TABLE IF NOT EXISTS spending_goals (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    target_vnd INTEGER NOT NULL,
    saved_vnd INTEGER NOT NULL DEFAULT 0,
    due_on TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    field_updated_at TEXT NOT NULL DEFAULT '{}'
);
