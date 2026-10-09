# 0003 · Tauri v2 cho desktop và mobile

Trạng thái: Đã chọn · Ngày: 2026-10-09

Desktop (Windows, macOS, Linux) và mobile (Android, iOS) dùng chung **một dự án Tauri v2** (`apps/native`). Tauri bọc giao diện web trong một cửa sổ gốc và cho phép gọi code Rust, nên dùng lại được cả giao diện React lẫn engine Rust. Cấu hình này đã được thử ở một dự án nội bộ trước đó cho Android và desktop, nên không phải thử nghiệm từ số không.

Đánh đổi và rủi ro:

- Đội Tauri tự nói mobile chưa phải "công dân hạng nhất": làm được ứng dụng production nhưng chưa phải plugin chính thức nào cũng chạy trên mobile, và đôi khi phải viết code native (Kotlin, Swift). Xem [research/tauri-mobile.md](../research/tauri-mobile.md).
- Cấu hình đã thử đó chưa có iOS. Luồng đăng nhập Google qua loopback (xem [0008](0008-dang-nhap-google-theo-nen.md)) chưa được thử trên iOS.
- Cần cài thêm bộ công cụ Rust, Android Studio và Xcode để build.

Nếu mobile gặp vấn đề không vượt qua được, phương án dự phòng là bọc cùng giao diện bằng Capacitor. Giao diện và engine không đổi, chỉ đổi vỏ và cách gọi engine (cổng `EngineClient`).
