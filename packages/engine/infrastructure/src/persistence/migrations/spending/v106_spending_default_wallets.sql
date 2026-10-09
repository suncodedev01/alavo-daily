INSERT OR IGNORE INTO spending_wallets
    (id, name, kind, opening_balance_vnd, position, updated_at, deleted_at, field_updated_at)
VALUES
    ('wallet-bank', 'Chuyển khoản', 'bank', 0, 2, 0, NULL, '{}'),
    ('wallet-ewallet', 'Ví điện tử', 'ewallet', 0, 3, 0, NULL, '{}');
