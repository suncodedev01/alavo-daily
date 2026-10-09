CREATE TABLE IF NOT EXISTS spending_categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    kind TEXT NOT NULL,
    budget_vnd INTEGER,
    is_fixed INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    field_updated_at TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_spending_categories_position
    ON spending_categories (position);

INSERT OR IGNORE INTO spending_categories
    (id, name, icon, kind, budget_vnd, is_fixed, position, updated_at, deleted_at, field_updated_at)
VALUES
    ('category-food', 'Ăn uống', 'fork-knife', 'expense', NULL, 0, 1, 0, NULL, '{}'),
    ('category-transport', 'Đi lại', 'car', 'expense', NULL, 0, 2, 0, NULL, '{}'),
    ('category-shopping', 'Mua sắm', 'shopping-bag', 'expense', NULL, 0, 3, 0, NULL, '{}'),
    ('category-fun', 'Giải trí', 'film-strip', 'expense', NULL, 0, 4, 0, NULL, '{}'),
    ('category-health', 'Sức khoẻ', 'heartbeat', 'expense', NULL, 0, 5, 0, NULL, '{}'),
    ('category-bills', 'Hoá đơn', 'lightning', 'expense', NULL, 0, 6, 0, NULL, '{}'),
    ('category-home', 'Nhà ở', 'house-line', 'expense', NULL, 1, 7, 0, NULL, '{}'),
    ('category-income', 'Thu nhập', 'arrow-down-left', 'income', NULL, 0, 8, 0, NULL, '{}');
