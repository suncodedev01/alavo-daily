# Tauri trên mobile: những gì đã tra

Ngày tra: 2026-10-09. Phục vụ [0003](../decisions/0003-tauri-cho-desktop-va-mobile.md).

## Mức độ trưởng thành

[Bài công bố bản RC của Tauri 2.0](https://v2.tauri.app/blog/tauri-2-0-0-release-candidate/) (2024), đội Tauri tự nói:

- Có thể xây ứng dụng mobile production bằng Tauri.
- Họ đã hứa quá về "mobile là công dân hạng nhất" cho bản 2.0.
- Chưa phải mọi tính năng và plugin của desktop đã có trên mobile, và trải nghiệm phát triển mobile còn cần cải thiện.
- Plugin có thể kèm thư viện Android (Kotlin) và gói Swift cho iOS, tức đôi khi phải viết code native. Đối tác CrabNebula đóng góp vài plugin mobile (NFC, quét mã vạch, sinh trắc học, haptics, định vị).

Tôi không tìm được đánh giá nào mới hơn về mobile. Một bài blog tháng 7/2026 nói Tauri ở nhánh 2.11 và "đa phần dùng được cho desktop". Phải kiểm tra từng plugin định dùng trên iOS và Android.

## Plugin SQL

[Plugin SQL chính thức](https://v2.tauri.app/plugin/sql/) liệt kê Android và iOS, dùng sqlx, có migration, và mở giao diện để phía JavaScript chạy SQL. Tài liệu không nói đường dẫn file cơ sở dữ liệu trên mobile. Dự án chọn `rusqlite` gọi từ Rust thay vì plugin này, xem [0004](../decisions/0004-sqlite-hai-nen-mot-trait.md).

## Đăng nhập Google trên Tauri

Không có hướng dẫn nào riêng cho Tauri. Plugin [`tauri-plugin-oauth`](https://www.lib.rs/crates/tauri-plugin-oauth) chỉ là bản thử nghiệm 2023 dựa trên localhost. Dự án nội bộ trước đó tự viết máy chủ loopback bằng Rust. Xem [google-oauth-va-drive.md](google-oauth-va-drive.md).

## Cấu hình đã chạy ở dự án nội bộ trước đó

Dự án đó dùng Tauri 2.2 với `rusqlite`, `tiny_http`, plugin `http` và `opener`, kèm vài plugin tự viết (widget, quảng cáo). Chạy cho Android và desktop, **chưa có iOS**. Có CI GitHub Actions cho bản phát hành Android và desktop.

## Phương án dự phòng

Capacitor bọc cùng giao diện web. Chưa tra cứu kỹ plugin SQLite và OAuth của nó.
