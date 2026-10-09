# 0008 · Đăng nhập Google theo từng nền

Trạng thái: Đề xuất (có rủi ro chính sách chưa loại bỏ) · Ngày: 2026-10-09

Mỗi nền có cách đăng nhập khác nhau vì ràng buộc của Google khác nhau, và tất cả nằm sau cổng `GoogleAuth`:

- **Tauri (mobile và desktop):** OAuth client loại Desktop, dùng PKCE (cơ chế chứng minh mã nhận về là của chính ứng dụng đã xin), mở trình duyệt hệ thống và nhận mã qua máy chủ loopback chạy ngay trên máy (`http://127.0.0.1:<cổng>/`). Lưu refresh token để các lần đồng bộ sau chạy ngầm. Google không còn chấp nhận custom URI scheme cho client mới.
- **Extension:** `chrome.identity.launchWebAuthFlow` với client loại Web application, chạy được cả Chrome và Edge. Google đòi `client_secret` khi đổi mã dù có PKCE nên secret này nằm công khai trong bản build. Chấp nhận đánh đổi đó và giảm nhẹ bằng phạm vi nhỏ nhất, cảnh báo hạn mức trên dự án Cloud và sẵn sàng đổi secret nếu thấy bị lạm dụng.
- **Web:** Google Identity Services (token model). Không có refresh token và tài liệu Google chỉ cho lấy token mới từ thao tác của người dùng, nên khi token hết hạn giao diện phải hiện trạng thái "Cần đăng nhập lại Google" với một nút bấm.

Rủi ro chưa loại bỏ: tài liệu Google ghi cách loopback là **không còn khuyến nghị cho client loại Android và iOS**, chỉ khuyến nghị cho ứng dụng desktop. Một dự án nội bộ trước đó đã dùng client loại Desktop trên Android và chạy được, nhưng đây là hành vi nằm ngoài khuyến nghị chính thức nên Google có thể đổi. Cần theo dõi, và cần thử trên iOS vì dự án đó chưa có iOS.

Xem [research/google-oauth-va-drive.md](../research/google-oauth-va-drive.md).
