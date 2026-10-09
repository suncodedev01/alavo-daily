# 0001 · Local-first, không có server

Trạng thái: Đã chọn · Ngày: 2026-10-09

Toàn bộ dữ liệu nằm trong SQLite trên thiết bị của người dùng, không có máy chủ của chúng ta và không có tài khoản đăng ký. Lý do trực tiếp là ứng dụng được định nghĩa là **không có backend**. Lợi ích đi kèm: chi phí vận hành bằng không, dữ liệu tài chính và công thức không rời khỏi tay người dùng, và ứng dụng chạy bình thường khi mất mạng.

Cách làm này gọi là **local-first**: thiết bị là nơi lưu bản chính, mạng chỉ dùng để đồng bộ giữa các thiết bị khi có thể. Mỗi thiết bị tự sinh một `device_id` ở lần chạy đầu để phân biệt nguồn của thay đổi.

Đánh đổi cần chấp nhận:

- Không có đồng bộ thời gian thực. Máy này sửa thì máy kia thấy sau lần đồng bộ kế tiếp (xem [0006](0006-dong-bo-google-drive.md), [0007](0007-gop-du-lieu-hlc-nhat-ky-su-kien.md)).
- Mất thiết bị là mất dữ liệu nếu chưa từng kết nối Google. Giao diện phải nói rõ điều này và có nút xuất dữ liệu.
- Không có thông báo đẩy từ máy chủ. Mọi lời nhắc phải được lên lịch ngay trên thiết bị, và khả năng đó khác nhau theo nền tảng.
- Trên web, trình duyệt có thể xoá dữ liệu lưu trong máy. Xem [research/web-storage-va-sqlite-wasm.md](../research/web-storage-va-sqlite-wasm.md).
