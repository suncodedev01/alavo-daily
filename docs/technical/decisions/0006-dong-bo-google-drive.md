# 0006 · Đồng bộ qua Google Drive

Trạng thái: Đề xuất (còn một việc cần kiểm chứng) · Ngày: 2026-10-09

Không có server nên chỗ trung gian duy nhất để hai thiết bị trao đổi dữ liệu là **Google Drive của chính người dùng**. Ứng dụng chỉ xin phạm vi `drive.file` (đọc và sửa những tệp do chính ứng dụng tạo) và lưu trong **một thư mục nhìn thấy được** tên "Alavo Daily Backup" ở My Drive. Mỗi thiết bị chỉ ghi vào file của chính nó (`events-<device_id>.json`) và đọc file của các thiết bị khác, vì Drive không có khoá nên hai máy ghi chung một file sẽ đè nhau mà không ai biết.

Không dùng thư mục ẩn `appDataFolder`. Theo tài liệu Drive, thư mục đó ẩn với người dùng, file trong đó không chia sẻ, không chuyển, không bỏ vào thùng rác được, và **bị xoá khi người dùng gỡ ứng dụng khỏi My Drive**. Thư mục nhìn thấy thì người dùng tự mở, kiểm tra và sao lưu thủ công được. Xem [research/google-oauth-va-drive.md](../research/google-oauth-va-drive.md).

Đánh đổi:

- Người dùng có thể xoá hoặc sửa nhầm file trong thư mục nhìn thấy.
- Đồng bộ chỉ chạy khi ứng dụng đang mở, không có tiến trình nền. Giao diện không được hứa khác đi.
- Số file tăng theo số thiết bị.

**Việc còn mở:** bản web và bản Tauri dùng hai OAuth client khác nhau. Chưa có nguồn nào xác nhận với `drive.file` hai client có đọc được file của nhau hay không. Phải làm một bản thử nhỏ trước khi dựng đồng bộ thật. Nếu không đọc chung được thì thiết kế file phải đổi.
