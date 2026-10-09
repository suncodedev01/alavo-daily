CREATE TABLE IF NOT EXISTS hub_delta_events (
    event_id TEXT PRIMARY KEY NOT NULL,
    module TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    changed_fields TEXT,
    payload_json TEXT NOT NULL,
    device_id TEXT NOT NULL,
    hlc INTEGER NOT NULL,
    is_synced INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_hub_delta_events_pending
    ON hub_delta_events (is_synced, hlc);
