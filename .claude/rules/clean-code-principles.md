# Rule: Clean Code, SOLID và Giới hạn Kích thước

> Áp dụng cho mọi ngôn ngữ trong repo. Rule này bổ sung cho `.claude/rules/general-code-style.md`, nói rõ **ngưỡng cụ thể** để biết khi nào code đã quá lớn hoặc quá rối.

Hai khái niệm xuất hiện nhiều lần trong file này:

- **Cohesion (độ gắn kết):** những thứ nằm chung một hàm, một file hay một module có thật sự cùng phục vụ một việc không. Gắn kết cao nghĩa là mở một file ra là hiểu nó làm gì chỉ bằng một câu.
- **Coupling (độ dính):** sửa chỗ này thì buộc phải sửa chỗ kia. Dính thấp nghĩa là hai phần giao tiếp qua một mặt tiếp xúc nhỏ và rõ, nên đổi bên trong phần này không lan sang phần kia.

Mục tiêu luôn là **gắn kết cao, dính thấp**. Các quy tắc bên dưới là cách đo hai thứ đó.

## 1. Đơn giản trước

1. **Chọn giải pháp đơn giản nhất chạy đúng**, rồi mới tính tới thứ khác. Nếu hai cách cùng đúng thì chọn cách ít khái niệm hơn, ít file hơn, ít tầng gián tiếp hơn.
2. **Không làm cho tương lai chưa có** (YAGNI). Không thêm tham số, trait, cấu hình hay lớp bọc chỉ vì "sau này có thể cần". Chỗ được thiết kế để mở rộng đã được khai báo sẵn và chỉ có hai: manifest của module và chính sách gộp đồng bộ (xem `.claude/rules/architecture-modules.md`, `.claude/rules/sync-rules.md`). Ngoài hai chỗ đó thì viết cho nhu cầu hiện tại.
3. **Trừu tượng hoá khi lặp lần thứ ba**, không phải lần thứ hai. Hai đoạn giống nhau có thể chỉ tình cờ giống. Lặp ba lần thì mới đáng rút ra một hàm có tên rõ nghĩa.
4. Không viết code thông minh. Code dễ đọc hơn code ngắn. Nếu phải giải thích một dòng thì tách nó thành hàm đặt tên tử tế.

## 2. Giới hạn kích thước

Hai mức: **mềm** là cảnh báo khi review, phải có lý do mới giữ nguyên. **Cứng** là lint hoặc CI báo lỗi, không merge được.

| Đối tượng | Mềm | Cứng |
|---|---|---|
| Độ rộng một dòng | 100 ký tự | 120 ký tự |
| Hàm hoặc method (Rust, TS) | 20 dòng | 30 dòng |
| Component React (phần thân hàm) | 80 dòng | 120 dòng |
| Custom hook | 40 dòng | 60 dòng |
| File | 250 dòng | 400 dòng |
| Struct hoặc class, tính cả `impl` | 150 dòng | 250 dòng |
| Số method công khai của một struct hoặc class | 7 | 10 |
| Số trường của một struct | 8 | 12 |
| Số method của một trait hoặc interface | 4 | 6 |
| Số tham số của hàm | 3 | 4 |
| Số props của component | 6 | 10 |
| Độ lồng (`if`, `for`, `match`, callback) | 2 cấp | 3 cấp |
| Độ phức tạp chu trình (cyclomatic) của hàm | 8 | 12 |
| Số `import` hoặc `use` ở đầu file | 12 | 20 |
| Một câu SQL | 30 dòng | 50 dòng |

Cách xử lý khi chạm ngưỡng:

- **Hàm dài:** tách thành các hàm nhỏ, mỗi hàm một việc, đặt tên theo việc đó. Đừng tách máy móc theo số dòng mà làm mất mạch đọc.
- **Quá nhiều tham số:** gom thành một struct hoặc object có tên (`NewTransaction`, `ShoppingFilter`). Không dùng tham số boolean để bật tắt hành vi, hãy tách thành hai hàm.
- **File hoặc struct to:** thường là dấu hiệu đang làm hai việc. Tách theo việc, không tách theo "phần đầu, phần cuối".
- **Nhiều `import`:** file đó đang dính vào quá nhiều thứ. Xem lại nó có làm quá nhiều không.

**Ngoại lệ không bị đếm:** code sinh tự động, file migration `.sql`, bảng dữ liệu mẫu và file bản dịch i18n. Một ngoại lệ khác phải ghi **lý do bằng comment tiếng Anh ngay tại chỗ**, và đây là trường hợp comment được phép theo `.claude/rules/general-code-style.md`.

## 3. SOLID áp dụng vào repo này

Mỗi chữ cái dưới đây kèm đúng chỗ nó hiện ra trong dự án.

**S (một trách nhiệm).** Một hàm, struct hay component chỉ có **một lý do để bị sửa**. Use case "ghi chi phí đi chợ vào Chi tiêu" không tự tính tiền, không tự mở Drive, không tự định dạng chữ. Nó gọi các phần chuyên trách. Dấu hiệu vi phạm: mô tả nó phải dùng chữ "và".

**O (mở để mở rộng, đóng để sửa).** Thêm module mới là thêm một `ModuleManifest`, không sửa code của hub. Thêm chính sách gộp mới là thêm một biến thể, không sửa các chính sách cũ. Nếu thêm một tính năng mà phải sửa ở nhiều `match` rải rác thì thiết kế đang sai.

**L (thay thế được).** Mọi cài đặt của một trait phải dùng thay cho nhau mà người gọi không nhận ra. Hai bản `Database` (SQLite WASM và `rusqlite`) phải qua cùng một bộ test và cho cùng kết quả. Một cài đặt ném lỗi cho phương thức mà trait đã hứa là vi phạm.

**I (giao diện nhỏ).** Trait hoặc props chỉ chứa những gì người dùng nó cần. Một use case chỉ cần đọc thì nhận trait đọc, không nhận cả trait đọc ghi xoá. Component chỉ nhận đúng dữ liệu nó vẽ, không nhận cả đối tượng lớn rồi chỉ dùng hai trường.

**D (phụ thuộc vào trừu tượng).** Tầng `application` phụ thuộc trait do `domain` định nghĩa, không phụ thuộc `rusqlite` hay Drive. React phụ thuộc hàm do engine xuất ra, không phụ thuộc SQLite. Việc tạo cài đặt cụ thể (nối trait với `rusqlite`) chỉ xảy ra ở một chỗ duy nhất gọi là điểm lắp ráp (`wiring`).

## 4. Dính thấp, gắn kết cao

1. **Hướng phụ thuộc một chiều, không vòng.** Module A không import B rồi B import ngược A. Công cụ kiểm tra vòng phụ thuộc chạy trong CI.
2. **Mỗi thư mục tính năng có một điểm vào công khai** (`index.ts`, hoặc `mod.rs` chỉ `pub` những gì cần). Code bên ngoài chỉ import qua đó, không với vào file bên trong. Cái gì không cần ai dùng thì để riêng tư.
3. **Không có thư mục "rác chung".** Cấm đặt tên `utils`, `helpers`, `common`, `misc` cho code nghiệp vụ. Hàm nào thuộc tính năng nào thì nằm trong tính năng đó. Chỉ khi một hàm thật sự không gắn với nghiệp vụ nào (ví dụ định dạng tiền) mới vào `packages/client/common`, và tên file phải nói rõ nó làm gì.
4. **Dữ liệu đi theo giá trị, không đi theo tham chiếu chung.** Hai module không chia sẻ một đối tượng có thể bị sửa. Chúng trao nhau bản sao hoặc kiểu bất biến.
5. **Hỏi, đừng moi** (tell, don't ask). Thay vì lấy dữ liệu ra rồi tự quyết định bên ngoài, hãy bảo đối tượng chứa dữ liệu làm việc đó. Chuỗi gọi dài kiểu `a.b().c().d()` đi xuyên nhiều đối tượng là dấu hiệu dính chặt.
6. **Chia component React theo việc, không theo hình.** Component trình bày (nhận dữ liệu, trả ra giao diện) tách khỏi hook lấy dữ liệu. Logic nghiệp vụ không nằm trong JSX.

## 5. Viết code sạch

1. **Tên nói đúng ý.** Hàm là động từ (`merge_shopping_list`), biến là danh từ (`pending_events`). Tránh viết tắt khó đoán và tên chung chung (`data`, `info`, `handle`, `process`, `manager`).
2. **Thoát sớm thay vì lồng sâu.** Kiểm tra điều kiện lỗi và trường hợp đặc biệt ở đầu hàm rồi `return`, để phần chính đi thẳng một mạch.
3. **Không dùng số hay chuỗi "ma thuật".** Giá trị có ý nghĩa (ngưỡng cảnh báo 85%, số lần thử lại) đặt thành hằng số có tên.
4. **Bọc kiểu nguyên thuỷ có nghĩa.** Tiền là `Money`, không phải `i64` trần. Đồng hồ đồng bộ là `Hlc`, không phải số. Nhờ vậy không cộng nhầm tiền với số lượng, và quy tắc nằm ở một chỗ.
5. **Ưu tiên hàm thuần và dữ liệu bất biến.** Hàm cùng đầu vào ra cùng đầu ra, không đụng trạng thái ngoài, thì dễ test và dễ hiểu. Chỉ dùng biến có thể đổi (`mut`, `let`) khi thật cần.
6. **Tách đọc và ghi.** Một hàm hoặc trả về thông tin, hoặc làm thay đổi trạng thái, không làm cả hai.
7. **Lỗi là một phần của giao diện.** Mỗi hàm có thể thất bại phải nói rõ bằng kiểu trả về (`Result` ở Rust, kiểu lỗi có tên ở TS). Không nuốt lỗi, không trả `null` để ngầm báo lỗi.
8. **Test đi cùng logic.** Logic ở `domain` có test đơn vị. Test mô tả hành vi bằng tên (`merges_same_ingredient_across_recipes`), không đặt tên theo hàm.

## 6. Thực thi

- Các ngưỡng cứng ở mục 2 được cấu hình trong lint và chạy trong `pnpm lint` và CI: ESLint hoặc oxlint cho TypeScript (`max-lines`, `max-lines-per-function`, `max-params`, `max-depth`, `complexity`), clippy cho Rust (`too_many_lines`, `too_many_arguments`, `cognitive_complexity`). Chọn công cụ nào thì kiểm tra nó hỗ trợ đúng rule trước khi dựa vào.
- Khi review, người duyệt đối chiếu ngưỡng mềm và mục 3 đến 5. Một đoạn code vượt ngưỡng mà không có lý do thì trả lại, không merge kèm lời hẹn sửa sau.
- Sửa vi phạm trong **cùng commit** với thay đổi gây ra nó, không dồn thành một commit dọn dẹp riêng về sau.
