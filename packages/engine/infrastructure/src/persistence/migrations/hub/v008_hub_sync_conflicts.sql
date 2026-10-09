CREATE TABLE IF NOT EXISTS hub_sync_conflicts (
    id TEXT PRIMARY KEY NOT NULL,
    table_name TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    local_json TEXT NOT NULL,
    remote_json TEXT NOT NULL,
    remote_hlc INTEGER NOT NULL,
    remote_device_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_sync_conflicts_row
    ON hub_sync_conflicts (table_name, entity_id);
