# 0004 · SQLite chạy trên hai nền sau một trait

Trạng thái: Đã chọn · Ngày: 2026-10-09

Web và extension dùng **SQLite WASM lưu vào OPFS** (hệ tệp riêng của trình duyệt, cho phép ghi file lớn có truy cập đồng bộ). Tauri dùng `rusqlite`. Cả hai nằm sau một trait `Database` trong tầng `infrastructure` của engine, nên cùng một câu SQL và cùng một bộ test chạy được trên cả hai.

Chọn `rusqlite` gọi từ Rust thay vì plugin `tauri-plugin-sql` vì plugin đó mở giao diện cho phía JavaScript chạy SQL, trái với quy tắc cấm SQL ngoài engine ([0005](0005-engine-rust-bon-tang.md)).
Những điều phải nhớ khi dùng SQLite WASM, theo tài liệu của SQLite ([research/web-storage-va-sqlite-wasm.md](../research/web-storage-va-sqlite-wasm.md)):

- Nếu không có kho lưu bền vững thì cơ sở dữ liệu nằm trong bộ nhớ và mất khi tải lại trang. Vì vậy khi OPFS không dùng được phải **báo lỗi**, không lặng lẽ chuyển sang bộ nhớ.
- Safari bản dưới 17 không chạy với kiểu lưu mặc định. Kiểu mặc định cần thêm header COOP và COEP trên host. Kiểu `opfs-sahpool` không cần header nhưng chỉ cho một kết nối, nên mở tab thứ hai sẽ lỗi.
- Chỉ dùng chức năng SQLite có ở cả hai bản build. Tiện ích mở rộng (ví dụ FTS5) phải kiểm tra riêng trên từng bản.
