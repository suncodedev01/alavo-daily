# Rule: General Coding Style

> File này áp dụng cho mọi ngôn ngữ trong repo (Rust, TypeScript, SQL). Quy tắc riêng cho từng lớp nằm ở các file cùng thư mục.

Tên sản phẩm là **Alavo Daily** và scope package là `@alavo-daily/*`. Nếu sau này đổi tên thì đổi một lần bằng tìm và thay, đừng tạo alias.

## Tổ chức code

1. **Gom theo tính năng trước, rồi chia theo loại file bên trong tính năng.** Code của một tính năng nằm chung một thư mục `features/<tên_tính_năng>/` (ví dụ `features/recipes`, `features/shopping`), cả ở Rust lẫn React. Lý do: khi sửa một tính năng, mọi file cần mở đều ở cạnh nhau. Ở React, mỗi thư mục tính năng có cấu trúc cố định:
   - `components/`: component `.tsx`, kèm test của chúng (`X.test.tsx`).
   - `hooks/`: custom hook `useX.ts`.
   - `types.ts`: kiểu dùng trong tính năng (tách thành `types/` khi vượt 250 dòng).
   - `logic/`: hàm thuần không phụ thuộc React (tính toán, chuyển đổi dữ liệu).
   - `index.ts`: điểm vào công khai của tính năng.

   Thư mục nào rỗng thì không tạo. Cấm thư mục chung kiểu `lib/`, `foundation/`, `data/`, `ui/`: code dùng ở một tính năng thì nằm trong tính năng đó, dùng ở nhiều tính năng của cùng module thì tạo một tính năng có tên nói rõ việc (ví dụ `engine-errors/`).
2. **Hàm gọi nằm trên, hàm được gọi nằm dưới.** Đọc file từ trên xuống phải gặp luồng chính trước, helper sau. Áp dụng cho Rust, TypeScript và component React.
3. **Mỗi hàm hoặc component chỉ làm một việc.** Hàm dài thì tách helper và đặt tên rõ nghĩa. Tên hàm đóng vai trò của comment. Ngưỡng độ dài và độ phức tạp cụ thể nằm ở `.claude/rules/clean-code-principles.md`.
4. **Dòng code tối đa khoảng 100 ký tự.** Chuỗi gọi dài (`.map(...).filter(...)`) thì tách helper hoặc xuống dòng thụt lề.
5. **Xoá code thừa, không để code chết.** Không comment-out đoạn code cũ, đã có git giữ lịch sử.

## Comment

Mặc định **không viết comment**. Nếu thấy cần giải thích thì tách hàm và đặt tên lại. Chỉ viết comment khi có giới hạn hoặc đánh đổi thật cần cảnh báo người đọc sau, ví dụ khoá toàn cục, vòng quét O(n²), hay heuristic tạm. Comment luôn viết bằng **tiếng Anh**, kể cả khi trao đổi bằng tiếng Việt. Không đánh dấu kiểu `// TODO ponytail`.

## Đặt tên

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Component React, file component | `PascalCase.tsx` | `RecipeCard.tsx` |
| Module, hàm, biến TypeScript | `camelCase` | `mergeShoppingList.ts` |
| Module, hàm, biến Rust | `snake_case` | `merge_shopping_list` |
| Struct, enum Rust | `PascalCase` | `ShoppingItem` |
| Bảng và cột SQL | `snake_case` | `recipes_ingredients` |

## Ngôn ngữ và chuỗi hiển thị

- Chuỗi hiển thị cho người dùng **không viết cứng trong component**. Mọi chuỗi đi qua i18n (i18next), khoá theo câu tự nhiên, bản dịch ở `locales/<mã_ngôn_ngữ>/translation.json`. Ngôn ngữ mặc định là tiếng Việt.
- Tiền tệ, ngày, số định dạng bằng `Intl` với locale của người dùng, không tự ghép chuỗi.

## Quy trình

1. Sau mỗi bước code, chạy `pnpm typecheck` và các script `pnpm check:*` đã có. Một bước chưa xong khi còn lỗi ở bất kỳ package nào.
2. Với thay đổi giao diện, cần thêm một lượt kiểm tra trên trình duyệt thật. Type-check không bắt được lỗi hiển thị.
3. Commit message viết bằng **tiếng Anh**. Chuỗi UI hay khoá i18n tiếng Việt được trích dẫn trong message thì giữ nguyên văn.
4. Không push thẳng vào `main`. Tạo branch riêng rồi mở PR.
5. Tài liệu và rule dùng **đường dẫn tương đối** (`.claude/rules/...`), không dán đường dẫn tuyệt đối theo máy cá nhân.
