CREATE TABLE IF NOT EXISTS recipes_photos (
    id TEXT PRIMARY KEY NOT NULL,
    data_url TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);
