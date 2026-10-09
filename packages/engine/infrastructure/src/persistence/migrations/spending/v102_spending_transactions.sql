CREATE TABLE IF NOT EXISTS spending_transactions (
    id TEXT PRIMARY KEY NOT NULL,
    occurred_on TEXT NOT NULL,
    title TEXT NOT NULL,
    category_id TEXT NOT NULL,
    wallet_id TEXT NOT NULL,
    amount_vnd INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    recurring_rule TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    field_updated_at TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_spending_transactions_occurred_on
    ON spending_transactions (occurred_on);

CREATE INDEX IF NOT EXISTS idx_spending_transactions_category
    ON spending_transactions (category_id);

CREATE INDEX IF NOT EXISTS idx_spending_transactions_wallet
    ON spending_transactions (wallet_id);
