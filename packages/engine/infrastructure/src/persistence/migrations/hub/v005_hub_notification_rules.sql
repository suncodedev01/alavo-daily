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
