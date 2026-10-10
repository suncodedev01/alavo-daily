CREATE TABLE IF NOT EXISTS spending_payment_methods (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    field_updated_at TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_spending_payment_methods_position
    ON spending_payment_methods (position);

INSERT OR IGNORE INTO spending_payment_methods
    (id, name, icon, is_default, position, updated_at, deleted_at, field_updated_at)
VALUES
    ('payment-cash', 'Tiền mặt', 'money', 1, 1, 0, NULL, '{}'),
    ('payment-bank', 'Chuyển khoản', 'bank', 0, 2, 0, NULL, '{}'),
    ('payment-ewallet', 'Ví điện tử', 'device-mobile', 0, 3, 0, NULL, '{}');

ALTER TABLE spending_transactions ADD COLUMN payment_method_id TEXT;

CREATE INDEX IF NOT EXISTS idx_spending_transactions_payment_method
    ON spending_transactions (payment_method_id);

UPDATE spending_transactions
SET payment_method_id = CASE wallet_id
    WHEN 'wallet-cash' THEN 'payment-cash'
    WHEN 'wallet-bank' THEN 'payment-bank'
    WHEN 'wallet-ewallet' THEN 'payment-ewallet'
END
WHERE payment_method_id IS NULL
  AND wallet_id IN ('wallet-cash', 'wallet-bank', 'wallet-ewallet');

ALTER TABLE spending_wallets ADD COLUMN account_number TEXT;
