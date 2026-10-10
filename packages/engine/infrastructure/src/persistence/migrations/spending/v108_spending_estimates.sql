CREATE TABLE IF NOT EXISTS spending_estimates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    contingency_percent INTEGER NOT NULL DEFAULT 10,
    wallet_ids TEXT NOT NULL DEFAULT '[]',
    position INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    field_updated_at TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_spending_estimates_position
    ON spending_estimates (position);

CREATE TABLE IF NOT EXISTS spending_estimate_factors (
    id TEXT PRIMARY KEY NOT NULL,
    estimate_id TEXT NOT NULL,
    label TEXT NOT NULL,
    value INTEGER NOT NULL DEFAULT 1,
    position INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    field_updated_at TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_spending_estimate_factors_estimate
    ON spending_estimate_factors (estimate_id);

CREATE TABLE IF NOT EXISTS spending_estimate_items (
    id TEXT PRIMARY KEY NOT NULL,
    estimate_id TEXT NOT NULL,
    group_name TEXT NOT NULL,
    name TEXT NOT NULL,
    price_vnd INTEGER NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    priority TEXT NOT NULL DEFAULT 'must',
    by_factors TEXT NOT NULL DEFAULT '[]',
    paid_vnd INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    field_updated_at TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_spending_estimate_items_estimate
    ON spending_estimate_items (estimate_id);

CREATE TABLE IF NOT EXISTS spending_estimate_income (
    id TEXT PRIMARY KEY NOT NULL,
    estimate_id TEXT NOT NULL,
    label TEXT NOT NULL,
    amount_vnd INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    field_updated_at TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_spending_estimate_income_estimate
    ON spending_estimate_income (estimate_id);
