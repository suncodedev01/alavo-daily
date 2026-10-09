# Rule: Cơ sở dữ liệu và Migration

> Áp dụng cho mọi bảng SQLite và file `.sql` trong `packages/engine/infrastructure/src/persistence/migrations/`.

## Nguyên tắc

1. **Local-first.** Toàn bộ dữ liệu nằm trong SQLite trên thiết bị. Không có tài khoản, không có server. Mỗi thiết bị tự sinh một `device_id` (UUID v4) ở lần chạy đầu và lưu trong bảng `hub_device`.
2. **Không SQL ngoài engine.** Câu lệnh SQL chỉ tồn tại trong `infrastructure/`. Xem `.claude/rules/rust-engine-rules.md`.
3. **Trên web, lưu vào OPFS và xin lưu bền vững.** Gọi `navigator.storage.persist()` từ một thao tác của người dùng, và kiểm tra `persisted()` mỗi lần mở. Nếu không dùng được OPFS thì **báo lỗi rõ ràng**, không bao giờ lặng lẽ chuyển sang cơ sở dữ liệu trong bộ nhớ, vì mọi thứ người dùng nhập sẽ mất khi tải lại trang. Dữ liệu chỉ có trên một thiết bị là rủi ro thật (trình duyệt có thể xoá), nên giao diện có nút xuất JSON và khuyến khích kết nối Google.

## Migration

1. Mọi thay đổi schema là **một file SQL mới**, tên `vXXX_<mô_tả_ngắn>.sql` (ví dụ `v001_hub_device.sql`, `v002_spending_transactions.sql`). Đăng ký trong `get_migrations()` ở `migrations/mod.rs`.
2. **Chỉ đi tới, không sửa file đã vào nhánh chính.** Sai thì viết migration mới để sửa. Lý do: máy người dùng đã chạy file cũ, sửa lại sẽ làm schema mỗi máy một khác.
3. Một migration chạy lại không được làm hỏng dữ liệu (`CREATE TABLE IF NOT EXISTS`, kiểm tra trước khi thêm cột).
4. Mỗi migration cập nhật `docs/database-schema.md` trong cùng commit.
5. Dữ liệu khởi tạo (danh mục chi tiêu mặc định, nhóm khu mua) dùng **id xác định trước** (hằng số), để hai thiết bị cùng cài từ đầu vẫn ra cùng dòng thay vì nhân đôi khi đồng bộ.

## Quy ước bảng

| Việc | Quy ước |
|---|---|
| Tên bảng | Tiền tố module: `spending_*`, `recipes_*`, bảng dùng chung `hub_*` |
| Khoá chính | `id TEXT` là UUID v4. Dòng mà hai thiết bị có thể tự tạo ra như nhau thì dùng id xác định sinh từ nội dung |
| Khoá ngoại | **Khoá ngoại mềm**: lưu id nhưng không khai báo ràng buộc `FOREIGN KEY` |
| Tiền | `amount_vnd INTEGER`, đơn vị đồng. Không dùng `REAL` |
| Ngày của giao dịch | `occurred_on TEXT` dạng `YYYY-MM-DD` theo lịch địa phương, vì ngân sách tính theo tháng của người dùng |
| Thời điểm tạo | `created_at INTEGER` là mili giây Unix |
| Thời điểm sửa | `updated_at INTEGER` là đồng hồ lai (HLC), xem `.claude/rules/sync-rules.md` |
| Xoá | Không xoá thật. Đặt `deleted_at INTEGER` (HLC), gọi là tombstone |
| Thứ tự trong danh sách | Cột `position TEXT` kiểu chỉ số phân số, để chèn giữa hai dòng không phải đánh số lại |

Khoá ngoại mềm vì đồng bộ có thể áp sự kiện của dòng con trước dòng cha. Khoá ngoại cứng sẽ làm lần áp đó thất bại.

Bảng nào tham gia đồng bộ phải có `updated_at`, `deleted_at`, và `field_updated_at TEXT` (JSON ánh xạ tên cột tới HLC lần ghi gần nhất) nếu dùng chính sách gộp theo trường.

## Viết SQL trong Rust

Viết câu lệnh dưới dạng raw string nhiều dòng `r#"..."#`, mỗi mệnh đề (`SELECT`, `FROM`, `JOIN`, `WHERE`, `ORDER BY`, `LIMIT`) một dòng thụt lề rõ ràng. Luôn truyền tham số bằng bind, không ghép chuỗi từ dữ liệu người dùng.

```rust
let sql = r#"
    SELECT id, name, amount_vnd
    FROM spending_budgets
    WHERE deleted_at IS NULL
    ORDER BY name
"#;
```
