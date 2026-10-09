# Rule: Test

> Một tính năng chưa xong khi chưa có test. Test được viết **cùng lúc** với code, không để dồn lại.

## Mỗi tầng test gì

| Tầng | Công cụ | Phải có test cho |
|---|---|---|
| Rust `domain` | `cargo test`, test nằm cùng file (`#[cfg(test)]`) | Mọi quy tắc nghiệp vụ thuần: gộp danh sách đi chợ, đổi khẩu phần, tính ngân sách, tính ngày, HLC, chính sách gộp đồng bộ |
| Rust `application` | `cargo test`, dùng `alavo_infrastructure::testing` | Mọi use case: đường chạy đúng, dữ liệu sai, không tìm thấy, và hiệu ứng phụ (sự kiện đồng bộ, thông báo) |
| Rust `presentation` | `cargo test`, gọi qua `Engine::call` | Mọi lệnh: đọc payload JSON, kiểu trả về đúng tên trường `camelCase`, lỗi có mã đúng |
| Rust `infrastructure` | `cargo test` | Migration chạy từ đầu và chạy lại không lỗi, repository đọc ghi đúng kiểu |
| TypeScript logic thuần | Vitest | Hàm định dạng, tính toán, chuyển đổi dữ liệu |
| React component và hook | Vitest cùng Testing Library, engine giả | Hiển thị, tương tác chính, trạng thái tải, rỗng, lỗi |
| Toàn ứng dụng | Playwright trên bản web thật (worker và SQLite WASM) | Các luồng chính của từng module và của hub |

## Cách viết

1. **Dữ liệu và thời gian cố định.** Test Rust dùng `TestEnv` (đồng hồ cố định, id dự đoán được) và `migrated_memory_db()`. Cấm đọc đồng hồ thật hay tạo id ngẫu nhiên trong test. Test TypeScript cố định ngày bằng tham số, không dùng `new Date()` trực tiếp trong logic được test.
2. **Mỗi test kiểm một hành vi và tên nói đúng hành vi đó**, ví dụ `merges_same_ingredient_across_recipes`, không đặt theo tên hàm.
3. **Phủ ba nhóm trường hợp:** đường chạy đúng, đầu vào sai (rỗng, âm, ngày không tồn tại, id không có), và biên (đầu tháng, cuối tháng, đúng ngưỡng 85% và 100%, danh sách rỗng, số lượng lẻ).
4. **Kiểm cả hiệu ứng phụ.** Ghi vào bảng đồng bộ thì phải có sự kiện trong `hub_delta_events`. Vượt ngưỡng ngân sách thì phải có đúng một thông báo, và gọi lại không tạo thêm.
5. **Test giao diện bằng hành vi người dùng**, truy vấn theo vai trò và nhãn chữ (`getByRole`, `getByText`), không theo tên class hay cấu trúc DOM.
6. **Test phải chạy độc lập và theo thứ tự bất kỳ**, không dựa vào kết quả của test khác.
7. Lỗi được sửa thì thêm một test tái hiện lỗi đó trước.

## Khi nào được xem là xong

`cargo test` và `pnpm test` đều xanh, `pnpm typecheck` sạch, và với thay đổi giao diện thì thêm một lượt chạy trên trình duyệt thật. Báo kết quả test thật, không báo "đã test" khi chưa chạy.
