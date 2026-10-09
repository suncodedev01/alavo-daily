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

## Đã code nhưng chưa chạy thử trên thiết bị thật

Ngày ghi: 2026-10-09. Phần Rust của ứng dụng native đã có test đơn vị chạy trên Windows. Chưa build Android lần nào (máy dựng có Android SDK và NDK nhưng chưa dùng tới), không có iOS và chưa gọi Google thật, nên các điểm dưới đây chỉ được viết theo tài liệu, chưa ai thấy chạy.

- **Đăng nhập Google qua loopback.** Ứng dụng mở một cổng tạm trên `127.0.0.1`, mở trình duyệt hệ thống tới trang đăng nhập của Google, rồi Google chuyển trình duyệt về cổng đó kèm mã. Desktop và mobile dùng chung một đoạn code (`apps/native/src-tauri/src/google_auth`). Chưa thử: Android có giữ cổng tạm sống khi ứng dụng bị đẩy xuống nền lúc người dùng đang ở trình duyệt hay không (nếu hệ điều hành đóng ứng dụng thì phiên đăng nhập hỏng và người dùng phải bấm lại), và iOS hoàn toàn chưa thử. Tài liệu Google ghi cách loopback không còn khuyến nghị cho client Android và iOS, xem [0008](../decisions/0008-dang-nhap-google-theo-nen.md).
- **Cất refresh token.** Desktop dùng kho khoá của hệ điều hành qua crate `keyring` (Credential Manager, Keychain, Secret Service). `keyring` không có bản cho Android, nên trên Android refresh token chỉ nằm trong bộ nhớ và người dùng phải đăng nhập lại mỗi lần mở ứng dụng. Muốn bền vững cần một plugin Kotlin dùng Android Keystore. iOS dùng Keychain qua `keyring` nhưng chưa thử.
- **Lưu tệp xuất dữ liệu.** Lệnh `save_text_file` mở hộp thoại lưu của `tauri-plugin-dialog` rồi ghi qua `tauri-plugin-fs`, cách này đọc được cả đường dẫn thường lẫn địa chỉ `content://` của Android. Chưa thử trên Android và iOS. Nếu hộp thoại lưu không chạy ổn trên mobile thì lệnh trả lỗi và giao diện hiện thông báo "Không xuất được dữ liệu".
- **Nhắc theo giờ khi ứng dụng đóng.** Plugin thông báo của Tauri khai báo `POST_NOTIFICATIONS` nhưng không khai báo quyền báo thức chính xác, nên nếu thiếu thì Android 12 trở lên đặt giờ không chính xác và nhắc có thể trễ. Bước release Android tự thêm `USE_EXACT_ALARM` và `SCHEDULE_EXACT_ALARM` (giới hạn tới Android 12L) vào `AndroidManifest.xml` sinh ra. `USE_EXACT_ALARM` chỉ nên dùng khi phát hành ngoài Google Play, vì Play giới hạn quyền này cho ứng dụng báo thức hoặc lịch. Chưa thử hiệu ứng thật của chế độ tiết kiệm pin.
- **Xin quyền thông báo.** Ứng dụng chỉ hỏi khi người dùng bấm nút "Cho phép" ở Cài đặt, không hỏi lúc mở. Plugin chỉ cho biết "đã cấp" hoặc "chưa cấp", không phân biệt "chưa hỏi" với "đã từ chối" trước khi hỏi, nên sau lần mở lại ứng dụng nút "Cho phép" xuất hiện lại dù người dùng đã từ chối trước đó.
- **Nhập công thức từ liên kết.** Lệnh `fetch_page` dùng thư viện `ureq` với rustls, chặn địa chỉ loopback, mạng nội bộ và link-local ở từng bước kết nối. Đã kiểm tra bằng test không dùng mạng thật, chưa thử với các trang công thức thật và chưa thử sau proxy.
