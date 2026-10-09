INSERT OR IGNORE INTO hub_notification_rules
    (id, module, label, description, kind, time, enabled, position)
VALUES
    ('recipes.morning_menu', 'recipes', 'Nhắc món hôm nay vào buổi sáng',
     'Nhắc từ giờ này, rồi lặp lại mỗi giờ trong 3 giờ tiếp theo. Chưa có món thì gợi ý một món', 'time', '06:00', 1, 0);
