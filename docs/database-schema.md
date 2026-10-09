# Cơ sở dữ liệu

File này được sinh từ các migration trong `packages/engine/infrastructure/src/persistence/migrations/`. **Không sửa tay**: sửa file SQL rồi chạy `node scripts/gen-schema-doc.mjs`.

Quy ước chung nằm ở `.claude/rules/database-migrations-rules.md`: khoá chính là `TEXT`, tiền là số nguyên đồng (`*_vnd`), ngày là `YYYY-MM-DD`, `updated_at` là đồng hồ lai (HLC), xoá mềm bằng `deleted_at`, và không khai báo khoá ngoại cứng.

## Hub (v001–v099)

### v001_hub_device.sql

```sql
CREATE TABLE IF NOT EXISTS hub_device (
    id TEXT PRIMARY KEY NOT NULL,
    device_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_hlc INTEGER NOT NULL DEFAULT 0
);
```

### v002_hub_settings.sql

```sql
CREATE TABLE IF NOT EXISTS hub_settings (
    id TEXT PRIMARY KEY NOT NULL,
    value_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
```

### v003_hub_delta_events.sql

```sql
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
```

### v004_hub_notifications.sql

```sql
CREATE TABLE IF NOT EXISTS hub_notifications (
    id TEXT PRIMARY KEY NOT NULL,
    module TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    dedupe_key TEXT,
    created_at INTEGER NOT NULL,
    read_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_notifications_dedupe
    ON hub_notifications (dedupe_key)
    WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hub_notifications_created
    ON hub_notifications (created_at DESC);
```

### v005_hub_notification_rules.sql

```sql
CREATE TABLE IF NOT EXISTS hub_notification_rules (
    id TEXT PRIMARY KEY NOT NULL,
    module TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT NOT NULL,
    kind TEXT NOT NULL,
    time TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    position INTEGER NOT NULL
);

INSERT OR IGNORE INTO hub_notification_rules
    (id, module, label, description, kind, time, enabled, position)
VALUES
    ('spending.budget_alert', 'spending', 'Cảnh báo khi dùng 85% ngân sách',
     'Nhắc ngay khi một danh mục gần hết', 'event', NULL, 1, 1),
    ('spending.bill_reminder', 'spending', 'Nhắc hoá đơn trước 2 ngày',
     'Điện, nước, internet, thẻ tín dụng', 'time', '09:00', 1, 2),
    ('spending.weekly_summary', 'spending', 'Tóm tắt chi tiêu cuối tuần',
     'Gửi vào Chủ Nhật', 'time', '20:00', 1, 3),
    ('recipes.cook_reminder', 'recipes', 'Nhắc nấu bữa tối',
     'Tính lùi từ thời gian nấu của món', 'time', '17:30', 1, 1),
    ('recipes.shop_reminder', 'recipes', 'Nhắc đi chợ',
     'Khi thực đơn còn nguyên liệu chưa mua, vào Thứ Bảy', 'time', '16:00', 1, 2),
    ('recipes.defrost_reminder', 'recipes', 'Nhắc rã đông tối hôm trước',
     'Cho món có thịt hoặc cá', 'time', '21:00', 0, 3),
    ('recipes.cooking_timer', 'recipes', 'Hẹn giờ trong chế độ nấu ăn',
     'Kêu khi hết giờ từng bước', 'always', NULL, 1, 4);
```

### v006_hub_morning_menu_rule.sql

```sql
INSERT OR IGNORE INTO hub_notification_rules
    (id, module, label, description, kind, time, enabled, position)
VALUES
    ('recipes.morning_menu', 'recipes', 'Nhắc món hôm nay vào buổi sáng',
     'Nhắc từ giờ này, rồi lặp lại mỗi giờ trong 3 giờ tiếp theo. Chưa có món thì gợi ý một món', 'time', '06:00', 1, 0);
```

### v007_hub_sync_peers.sql

```sql
CREATE TABLE IF NOT EXISTS hub_sync_peers (
    device_id TEXT PRIMARY KEY NOT NULL,
    high_water_hlc INTEGER NOT NULL DEFAULT 0,
    remote_marker TEXT,
    applied_at INTEGER NOT NULL
);
```

### v008_hub_sync_conflicts.sql

```sql
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
```

## Chi tiêu (v100–v199)

### v100_spending_categories.sql

```sql
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
```

### v101_spending_wallets.sql

```sql
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
```

### v102_spending_transactions.sql

```sql
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
```

### v103_spending_goals.sql

```sql
CREATE TABLE IF NOT EXISTS spending_goals (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    target_vnd INTEGER NOT NULL,
    saved_vnd INTEGER NOT NULL DEFAULT 0,
    due_on TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    field_updated_at TEXT NOT NULL DEFAULT '{}'
);
```

### v104_spending_bills.sql

```sql
CREATE TABLE IF NOT EXISTS spending_bills (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    icon TEXT NOT NULL,
    amount_vnd INTEGER NOT NULL,
    day_of_month INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    field_updated_at TEXT NOT NULL DEFAULT '{}'
);
```

### v105_spending_recurring_source.sql

```sql
ALTER TABLE spending_transactions ADD COLUMN recurring_source_id TEXT;

CREATE INDEX IF NOT EXISTS idx_spending_transactions_recurring_source
    ON spending_transactions (recurring_source_id);
```

## Món ăn (v200–v299)

### v200_recipes_recipes.sql

```sql
CREATE TABLE IF NOT EXISTS recipes_recipes (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    prep_min INTEGER NOT NULL DEFAULT 0,
    cook_min INTEGER NOT NULL DEFAULT 0,
    servings INTEGER NOT NULL,
    level TEXT NOT NULL DEFAULT 'medium',
    favorite INTEGER NOT NULL DEFAULT 0,
    icon TEXT NOT NULL DEFAULT 'cooking-pot',
    kcal INTEGER,
    note TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    field_updated_at TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_recipes_recipes_active
    ON recipes_recipes (deleted_at, name);
```

### v201_recipes_ingredients.sql

```sql
CREATE TABLE IF NOT EXISTS recipes_ingredients (
    id TEXT PRIMARY KEY NOT NULL,
    recipe_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    aisle TEXT NOT NULL DEFAULT 'other',
    cost_vnd INTEGER NOT NULL DEFAULT 0,
    position TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recipes_ingredients_recipe
    ON recipes_ingredients (recipe_id, deleted_at, position);
```

### v202_recipes_steps.sql

```sql
CREATE TABLE IF NOT EXISTS recipes_steps (
    id TEXT PRIMARY KEY NOT NULL,
    recipe_id TEXT NOT NULL,
    text TEXT NOT NULL,
    timer_min INTEGER NOT NULL DEFAULT 0,
    position TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recipes_steps_recipe
    ON recipes_steps (recipe_id, deleted_at, position);
```

### v203_recipes_plan_entries.sql

```sql
CREATE TABLE IF NOT EXISTS recipes_plan_entries (
    id TEXT PRIMARY KEY NOT NULL,
    planned_on TEXT NOT NULL,
    slot TEXT NOT NULL,
    recipe_id TEXT NOT NULL,
    servings INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recipes_plan_entries_day
    ON recipes_plan_entries (deleted_at, planned_on, slot);

CREATE INDEX IF NOT EXISTS idx_recipes_plan_entries_recipe
    ON recipes_plan_entries (recipe_id, deleted_at);
```

### v204_recipes_shopping_items.sql

```sql
CREATE TABLE IF NOT EXISTS recipes_shopping_items (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    aisle TEXT NOT NULL DEFAULT 'other',
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recipes_shopping_items_active
    ON recipes_shopping_items (deleted_at);
```

### v205_recipes_shopping_state.sql

```sql
CREATE TABLE IF NOT EXISTS recipes_shopping_state (
    id TEXT PRIMARY KEY NOT NULL,
    have INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);
```

### v206_recipes_photos.sql

```sql
CREATE TABLE IF NOT EXISTS recipes_photos (
    id TEXT PRIMARY KEY NOT NULL,
    data_url TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);
```
