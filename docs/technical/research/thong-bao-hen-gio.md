# Thông báo hẹn giờ không có server: những gì đã tra

Ngày tra: 2026-10-09. **Nghiên cứu chưa đầy đủ**, ghi lại để không phải tra lại từ đầu. Liên quan tới `capabilities.backgroundReminders` ở `.claude/rules/architecture-modules.md`.

## Web

Không có server thì không dùng được Web Push (cần máy chủ đẩy). Cách lên lịch thông báo ngay trên thiết bị là **Notification Triggers API**, nhưng theo [trang của Chrome](https://developer.chrome.com/docs/web-platform/notification-triggers) bảng trạng thái ghi thử nghiệm origin đã xong và **chưa ra mắt chính thức** (Launch: Not started). Bản sao cache có thể cũ hơn thực tế. Chưa kiểm tra Safari và Firefox. Kết luận tạm: trên web không nên hứa nhắc đúng giờ khi ứng dụng đã đóng.

## Tauri (desktop và mobile)

[Plugin thông báo chính thức](https://v2.tauri.app/plugin/notification/) liệt kê Android, iOS, macOS, Windows, Linux và có tuỳ chọn `schedule` để hẹn giờ hoặc lặp theo khoảng. Trên Android phải tạo kênh (channel) trước khi gửi thông báo dùng kênh đó. Có thêm một [plugin cộng đồng](https://github.com/Choochmeque/tauri-plugin-notifications) hỗ trợ hẹn ngày cụ thể hoặc lặp và quản lý thông báo đang chờ. Chưa có ví dụ cụ thể về cách huỷ thông báo đã hẹn, chưa thử trên máy thật.

## Extension

Chưa tra cứu. Cần xem khả năng hẹn giờ và hiện thông báo của extension MV3 trước khi quyết định.

## Hệ quả cho thiết kế

Giao diện phải đọc `capabilities.backgroundReminders` của nền đang chạy: chỉ hứa nhắc khi đã đóng ứng dụng ở nơi làm được, còn lại nói rõ nhắc chỉ hiện khi ứng dụng đang mở.
