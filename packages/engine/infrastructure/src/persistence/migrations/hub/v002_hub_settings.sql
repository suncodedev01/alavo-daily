CREATE TABLE IF NOT EXISTS hub_settings (
    id TEXT PRIMARY KEY NOT NULL,
    value_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
