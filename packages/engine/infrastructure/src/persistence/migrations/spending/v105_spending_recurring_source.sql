ALTER TABLE spending_transactions ADD COLUMN recurring_source_id TEXT;

CREATE INDEX IF NOT EXISTS idx_spending_transactions_recurring_source
    ON spending_transactions (recurring_source_id);
