CREATE TABLE IF NOT EXISTS hub_sync_peers (
    device_id TEXT PRIMARY KEY NOT NULL,
    high_water_hlc INTEGER NOT NULL DEFAULT 0,
    remote_marker TEXT,
    applied_at INTEGER NOT NULL
);
