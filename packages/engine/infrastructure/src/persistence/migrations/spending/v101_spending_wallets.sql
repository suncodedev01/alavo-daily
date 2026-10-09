CREATE TABLE IF NOT EXISTS spending_wallets (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    opening_balance_vnd INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    field_updated_at TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_spending_wallets_position
    ON spending_wallets (position);

INSERT OR IGNORE INTO spending_wallets
    (id, name, kind, opening_balance_vnd, position, updated_at, deleted_at, field_updated_at)
VALUES
    ('wallet-cash', 'Tiền mặt', 'cash', 0, 1, 0, NULL, '{}');
