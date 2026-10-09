# 0005 · Engine Rust bốn tầng, cấm SQL ngoài engine

Trạng thái: Đã chọn · Ngày: 2026-10-09

Mọi logic dữ liệu nằm trong một engine Rust chia bốn tầng: `domain` (quy tắc thuần), `application` (use case), `infrastructure` (SQLite, Google Drive) và `presentation` (cổng ra cho JavaScript). Phụ thuộc chỉ đi một chiều và `domain` không biết ai. React và TypeScript **không viết SQL**, chỉ gọi hàm engine xuất ra.

Chọn vậy vì cả bốn vỏ cần cùng một bộ quy tắc (gộp danh sách đi chợ, chính sách gộp đồng bộ, tính ngân sách), và một nơi duy nhất chứa logic thì test được và không lệch giữa các nền. Engine biên dịch ra WASM cho web và extension, và là crate Rust thường cho Tauri.

Đánh đổi:

- Bộ dựng nặng: Rust, WASM, Tauri và pnpm cùng tồn tại. Người mới phải biết Rust.
- File `.wasm` được tải mỗi lần mở ứng dụng, nên profile release ưu tiên kích thước (`opt-level = "z"`, `lto`). Thời gian chạy bị chặn bởi I/O của SQLite chứ không phải CPU, nên chọn kích thước thay vì tốc độ là hợp lý.
- Không dùng `panic = "abort"`, vì nó giết cả module thay vì trả lỗi về cho JavaScript.

Chi tiết: `.claude/rules/rust-engine-rules.md`.
