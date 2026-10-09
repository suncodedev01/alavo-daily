CREATE TABLE IF NOT EXISTS hub_notifications (
    id TEXT PRIMARY KEY NOT NULL,
    module TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    dedupe_key TEXT,
    created_at INTEGER NOT NULL,
    read_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_notifications_dedupe
    ON hub_notifications (dedupe_key)
    WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hub_notifications_created
    ON hub_notifications (created_at DESC);
