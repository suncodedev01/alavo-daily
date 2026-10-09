# Rule: Rust Engine

> Áp dụng cho `packages/engine`. Engine là nơi duy nhất chứa logic dữ liệu và truy cập SQLite, biên dịch ra hai dạng: WASM cho web và crate Rust thường cho Tauri.

## Bốn tầng

Phụ thuộc chỉ đi một chiều: `presentation → application → infrastructure → domain`, và `domain` không phụ thuộc ai.

| Tầng | Chứa gì |
|---|---|
| `domain/` | Struct, enum, quy tắc nghiệp vụ thuần (gộp danh sách đi chợ, đổi khẩu phần, chính sách gộp đồng bộ). Không biết SQLite hay JavaScript. |
| `application/` | Use case: ghép repository và domain thành một việc người dùng làm. |
| `infrastructure/` | Driver SQLite, repository, migration, trình bao Google Drive. |
| `presentation/` | Cổng ra JavaScript: `#[wasm_bindgen]` cho web, lệnh Tauri cho native. Chỉ đổi kiểu dữ liệu, không chứa nghiệp vụ. |

Trong mỗi tầng, code gom theo tính năng (`features/recipes`, `features/shopping`, `features/spending`) như trong `.claude/rules/architecture-modules.md`.

## Hai nền SQLite, một giao diện

Web dùng SQLite WASM lưu vào OPFS (hệ tệp riêng của trình duyệt), native dùng `rusqlite`. Cả hai nằm sau một trait `Database` trong `infrastructure`. Repository chỉ biết trait này. Lý do: nhờ vậy cùng một câu SQL và cùng một bộ test chạy được trên cả hai nền. Mọi tính năng chỉ dùng chức năng SQLite có ở cả hai bản build. Dùng thêm tiện ích mở rộng (ví dụ FTS5) thì phải kiểm tra cả hai bản.

## Quy tắc code

1. **Safe Rust.** Hạn chế tối đa `unsafe`. Không dùng `panic!`, `unwrap()`, `expect()` trong code chạy thật. Trả lỗi bằng `Result<T, E>`, và ở tầng `presentation` đổi thành lỗi mà JavaScript đọc được.
2. Khai báo `use` ở **đầu file**. Không viết đường dẫn dài inline như `std::rc::Rc::new(std::cell::RefCell::new(...))`.
3. Truy vấn trả danh sách đi qua một helper chung (`query_rows`). Không lặp mã khởi tạo bộ đệm kết quả trong từng repository.
4. Truyền tham chiếu hoặc slice thay vì `clone` không cần thiết.
5. Dữ liệu qua ranh giới Rust và TypeScript dùng `serde`. Kiểu TypeScript sinh từ struct Rust hoặc khớp 1-1 với nó, không viết tay hai nơi khác nhau.
6. Profile release của gói WASM ưu tiên kích thước (`opt-level = "z"`, `lto = true`, `codegen-units = 1`). Lý do: trình duyệt tải file `.wasm` mỗi lần mở ứng dụng, còn thời gian chạy bị chặn bởi I/O của SQLite chứ không phải CPU. Không dùng `panic = "abort"`, vì nó giết cả module thay vì trả lỗi cho JavaScript.

## Test

Logic ở `domain` có test đơn vị. Repository có test với SQLite trong bộ nhớ chạy qua trait `Database`. Chính sách gộp đồng bộ phải có test về tính **giao hoán và lặp lại được** (áp cùng một tập sự kiện theo thứ tự nào cũng ra cùng kết quả, áp hai lần không đổi kết quả).
