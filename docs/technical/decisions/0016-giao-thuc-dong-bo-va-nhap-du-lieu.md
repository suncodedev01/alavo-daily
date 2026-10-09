# 0016 · Giao thức đồng bộ qua Drive và nhập dữ liệu

Trạng thái: Đã chọn cho thiết kế, **chưa kiểm chứng với Google thật** (xem mục cuối) · Ngày: 2026-10-09

Quyết định [0006](0006-dong-bo-google-drive.md), [0007](0007-gop-du-lieu-hlc-nhat-ky-su-kien.md) và [0008](0008-dang-nhap-google-theo-nen.md) nói đồng bộ *làm gì*. File này ghi *làm thế nào*: định dạng file, cách biết đã đọc tới đâu, cách xử lý xung đột, và cách nhập dữ liệu dùng chung đường gộp với đồng bộ.

## Thuật ngữ dùng trong file này

- **Sự kiện (event):** một dòng của nhật ký thay đổi `hub_delta_events`. Mỗi lần ghi vào bảng đồng bộ, engine thêm một sự kiện trong cùng transaction. Sự kiện có `eventId`, `module`, `entityType`, `entityId`, `action` (`insert`, `update`, `delete`), `changedFields`, `payload` (nội dung dòng dạng JSON), `deviceId` và `hlc`.
- **HLC:** đồng hồ lai trong [0007](0007-gop-du-lieu-hlc-nhat-ky-su-kien.md). Trên mỗi thiết bị nó luôn tăng, nên các sự kiện của một thiết bị có HLC khác nhau và sắp xếp được.
- **Mốc đã đọc (high-water mark):** với mỗi thiết bị khác, HLC lớn nhất trong các sự kiện của nó mà máy này đã áp dụng. Sự kiện có HLC không lớn hơn mốc thì bỏ qua.
- **Dấu phiên bản file (marker):** chuỗi định danh nội dung một file trên Drive (`md5Checksum`). Đổi nội dung thì dấu đổi.

## File trên Drive

Thư mục nhìn thấy "Alavo Daily Backup" nằm ở My Drive. Mỗi thiết bị có đúng một file `events-<deviceId>.json` và chỉ ghi file đó. Nội dung:

```json
{
  "format": "alavo-daily-events",
  "version": 1,
  "deviceId": "…",
  "events": [ { "eventId": "…", "module": "spending", "entityType": "transaction", "entityId": "…",
                "action": "update", "changedFields": ["note"], "payload": { … }, "deviceId": "…", "hlc": 99562291200000 } ]
}
```

File chứa **toàn bộ** sự kiện của thiết bị từ trước đến giờ, xếp theo HLC tăng dần. Drive không có thao tác "nối thêm", nên mỗi lần có thay đổi mới thì máy ghi lại cả file bằng `multipart upload` (PATCH vào file cũ). Engine là nguồn thật của danh sách này, client không giữ bản sao. Hệ quả là file lớn dần theo thời gian. Khi cần thì thêm bước "chụp ảnh nhanh" (snapshot) để rút gọn, nhưng việc đó cần biết mọi thiết bị đã đọc tới đâu nên chưa làm.

Nếu file của chính thiết bị này biến mất khỏi thư mục (người dùng xoá, hoặc phải tạo lại thư mục), lần đồng bộ sau ghi lại toàn bộ dù không có gì chờ gửi. Hai thiết bị tạo thư mục cùng lúc thì thư mục cũ nhất (theo `createdTime`, rồi theo id) thắng, thư mục tạo sau bị xoá nếu xoá được.

## Một lượt đồng bộ

Client (`packages/client/common/src/sync`) chạy theo thứ tự này, engine lo phần gộp:

1. Kiểm tra mạng và token. Không có mạng thì báo `offline`, không có token thì báo `needs_login`, cả hai không gọi Drive.
2. Tìm hoặc tạo thư mục, liệt kê file (có phân trang).
3. Với mỗi file của thiết bị khác: nếu dấu phiên bản file bằng dấu đã lưu cho thiết bị đó (`sync.list_peers`) thì bỏ qua, không tải. Không thì tải, sắp sự kiện theo HLC, rồi gọi `sync.apply_remote` từng lô 200 sự kiện. Chỉ lô cuối của file mang theo dấu phiên bản, để lần đọc dở dang sẽ được làm lại thay vì bị bỏ qua.
4. Nếu có sự kiện chờ gửi (`sync.pending_events`), lấy toàn bộ sự kiện của máy (`sync.list_own_events`), ghi file của mình, rồi `sync.mark_synced` đúng các sự kiện đã chờ.
5. Báo trạng thái cho engine bằng `sync.report_state`, nên thanh bên, màn Cài đặt và mọi chỗ khác đọc cùng một nguồn qua `sync.status`.

Bộ điều phối chạy lượt này khi mở ứng dụng, khoảng 5 giây sau một thay đổi cục bộ (gom lại), khi mạng trở lại, mỗi 5 phút khi ứng dụng đang mở, và khi bấm "Đồng bộ ngay". Mỗi lúc chỉ có một lượt chạy; yêu cầu đến trong lúc đang chạy thì chạy thêm một lượt ngay sau đó. Lượt thất bại vì mạng, giới hạn tốc độ hoặc lỗi Drive tự thử lại sau 15 giây, 1 phút, 5 phút. Lỗi đăng nhập thì không tự thử lại vì cần người dùng bấm.

## Xử lý lỗi từ Drive

- **401:** token sai hoặc hết hạn, trạng thái `needs_login`. Giao diện hiện "Cần đăng nhập lại Google" với một nút.
- **429, hoặc 403 với lý do `rateLimitExceeded` hay `userRateLimitExceeded`, hoặc 5xx:** thử lại tối đa 4 lần với thời gian chờ tăng dần (hoặc theo `Retry-After`). Hết lượt vẫn lỗi thì trạng thái `error` với nguyên nhân `rate_limited` hoặc `drive`, kèm tự thử lại.
- **403 lý do khác (thiếu quyền, hết dung lượng):** không thử lại ngay, trạng thái `error`.
- **Mất mạng (`fetch` ném lỗi):** trạng thái `offline`, không hiện thông báo lỗi. Thay đổi chờ gửi vẫn nằm trong nhật ký.
- **404 khi dùng thư mục đã nhớ:** quên thư mục, tìm hoặc tạo lại, chạy lại lượt.
- **File của thiết bị khác hỏng hoặc không đọc được:** bỏ qua file đó, các file còn lại vẫn áp dụng. File từ phiên bản mới hơn của ứng dụng cũng bị bỏ qua và sẽ được đọc lại sau khi cập nhật.

## Áp dụng sự kiện của thiết bị khác

`sync.apply_remote` chạy trong một transaction và không ghi thêm sự kiện nào vào nhật ký (nếu ghi thì hai máy sẽ đẩy qua lại mãi). Với mỗi sự kiện, engine tìm bảng theo cặp `module` và `entityType`, đọc chính sách gộp của bảng đó trong `merge_policy.rs`, đọc dòng đang có (hoặc tạo dòng trống nếu chưa có), gộp rồi ghi lại. Sự kiện cho bảng hoặc loại dữ liệu mà bản này không biết thì bị bỏ qua và đếm vào `ignored`. Cột mà bảng không có cũng bị bỏ.

- **Gộp theo trường:** mỗi cột có HLC riêng trong `field_updated_at`. Cột nào có HLC lớn hơn thì thắng; HLC bằng nhau thì giá trị lớn hơn theo thứ tự chữ thắng, để mọi máy chọn giống nhau. Cột mà máy gửi không đóng dấu (ví dụ `created_at`) chỉ điền vào chỗ chưa có dấu.
- **Gộp cả dòng:** phiên bản có `updated_at` lớn hơn thay toàn bộ nội dung.
- **Xoá:** sự kiện xoá là một mốc HLC. Dòng bị xoá khi mốc đó không nhỏ hơn mọi lần sửa; có lần sửa muộn hơn thì dòng sống lại. Sự kiện xoá đến trước sự kiện tạo dòng (dòng con và dòng cha có thể đến thứ tự bất kỳ vì khoá ngoại là mềm) vẫn đúng: engine tạo dòng trống đã xoá và các sự kiện đến sau điền nội dung vào.
- **Mốc đã đọc:** sau mỗi lô, mốc của thiết bị gửi tăng lên bằng HLC lớn nhất đã xử lý. Đồng hồ của máy này cũng được đẩy lên qua HLC nhận được, để thay đổi cục bộ sau đó không bao giờ bị coi là cũ hơn thứ nó đã thấy. Sự kiện hỏng (thiếu trường, HLC ngoài khoảng cho phép) bị bỏ riêng từng cái.

Sự kiện xuất hiện hai lần hoặc theo thứ tự khác cho cùng kết quả. Có test hoán vị mọi thứ tự và test áp hai lần cho cả hai chính sách trong `domain/src/sync/row_merge.rs`, và test hai thiết bị giả lập (chi tiêu, món ăn, kế hoạch, danh sách đi chợ) trong `application/src/hub/sync/tests/`.

Hai chỗ chưa trùng khít hoàn toàn: nội dung đã xoá của dòng gộp cả dòng có thể khác nhau giữa hai máy tuỳ thứ tự (người dùng không thấy vì dòng đã xoá), và công thức có danh sách nguyên liệu do hai máy sửa cùng lúc sẽ gộp thành hợp của hai danh sách vì mỗi lần sửa tạo nguyên liệu mới. Cái thứ hai là cách module món ăn lưu nguyên liệu, không phải của lớp đồng bộ.

## Xung đột

Bảng gộp theo trường không có xung đột. Với bảng gộp cả dòng, khi sự kiện của thiết bị khác **sẽ thay thế** một dòng mà máy này có thay đổi chưa gửi cho chính dòng đó và nội dung khác nhau, engine **không áp dụng** mà lưu một bản ghi vào `hub_sync_conflicts` (nội dung hai bên, HLC và thiết bị kia). Mỗi dòng có tối đa một xung đột đang mở; sự kiện mới hơn của cùng dòng cập nhật bản ghi đó.

Nếu bản của thiết bị kia **cũ hơn** bản chưa gửi của máy này thì bản của máy này tự thắng theo HLC và không hỏi, vì nó sẽ thắng ở mọi máy khi được gửi đi.

Người dùng chọn bằng `sync.resolve_conflict { id, keep: "local" | "remote" }`. Dù chọn bản nào, engine ghi dòng đó với HLC mới và thêm một sự kiện mới vào nhật ký. Lý do: nếu chỉ giữ nguyên bản cũ thì thiết bị kia vẫn có thể có HLC lớn hơn và hai máy lệch nhau mãi. Sự kiện mới có HLC lớn hơn cả hai bản nên thắng ở mọi nơi.

## Nhập dữ liệu

`hub.export_data` ghi `{ format: "alavo-daily-export", version: 1, exportedAt, deviceId, tables }`, trong đó `tables` ánh xạ tên bảng tới mảng dòng đầy đủ (kể cả `updated_at`, `field_updated_at`, `deleted_at`). `hub.inspect_import { json }` chỉ đọc và đếm (số dòng, số bảng) để màn xác nhận có số liệu thật. `hub.import_data { json }` kiểm tra rồi biến mỗi dòng thành một sự kiện và đưa qua **cùng đường gộp** với sự kiện từ thiết bị khác:

- Tệp không phải JSON, thiếu `tables`, có `format` khác hoặc `version` lớn hơn bản ứng dụng hỗ trợ thì bị từ chối bằng lỗi `validation`. Tệp cũ chưa có `format` vẫn được nhận.
- Bảng lạ và dòng thiếu `id` được bỏ qua và đếm vào `skipped`.
- Nhập hai lần cùng một tệp không đổi gì ở lần hai, và không thêm sự kiện.
- Khác với sự kiện từ thiết bị khác, import không tạo xung đột (người dùng chủ động nhập), nhưng mỗi dòng thật sự thay đổi được ghi thêm một sự kiện cục bộ để các thiết bị khác nhận được qua đồng bộ. Đồng hồ được đẩy qua mọi HLC trong tệp.

## Đổi tài khoản Google

Khi `sync.report_state` mang một `accountEmail` khác tài khoản đã dùng lần trước, engine đánh dấu mọi sự kiện của máy là chưa gửi và xoá mốc đã đọc, vì tài khoản mới chưa có gì từ máy này. Ngắt kết nối rồi nối lại **cùng** tài khoản thì không làm lại gì. Ngắt kết nối chỉ đặt trạng thái `off`, xoá email khỏi trạng thái hiển thị và đăng xuất Google; dữ liệu, nhật ký và thư mục trên Drive giữ nguyên.

## Những gì chưa kiểm chứng với Google thật

Môi trường làm việc không có OAuth client ID nào, nên mọi thứ dưới đây chỉ được thử với Drive giả trong bộ nhớ (`common/src/sync/testing/fakeDrive.ts`) và Google Identity Services giả. Người triển khai cần thử bằng tay trước khi tin:

- Đăng nhập thật bằng Google Identity Services: cửa sổ đăng nhập, thông báo bị chặn popup, `expires_in` thật (thường 3600 giây), `prompt: ''` có bỏ qua màn chọn tài khoản như mong đợi không, và `revoke`.
- Phạm vi `drive.file` với hai OAuth client khác nhau (web và Tauri). Đây là việc còn mở của [0006](0006-dong-bo-google-drive.md): nếu client web không thấy file do client desktop tạo (hoặc ngược lại) thì các thiết bị khác nền không đồng bộ được với nhau và thiết kế file phải đổi. Bộ test hiện giả định mọi thiết bị thấy file của nhau.
- Câu truy vấn `q`, các trường `fields` (`md5Checksum`, `modifiedTime`, `createdTime`, `size`), thứ tự và phân trang của Drive API v3 thật. Fake chỉ cài phần tập con mà client dùng.
- Upload `multipart/related` cho cả tạo mới (POST) lẫn cập nhật (PATCH) với nội dung có ký tự tiếng Việt, dấu xuống dòng và file vài megabyte.
- Việc Drive thật có trả `md5Checksum` cho file JSON do ứng dụng tạo (client dùng nó làm dấu phiên bản file, rơi về `modifiedTime:size` nếu thiếu), và có trả 404 hay danh sách rỗng khi thư mục đã nhớ bị xoá.
- Mã lỗi thật cho giới hạn tốc độ (`403` với `userRateLimitExceeded` hay `429`), cho hết dung lượng và cho token thu hồi.
- `about.get` với phạm vi `drive.file` để lấy email tài khoản hiển thị (nếu không được thì giao diện hiện "Đã kết nối" thay cho email).
- Hai thiết bị tạo thư mục cùng lúc ngoài đời thật, vì Drive không bảo đảm thấy ngay thư mục vừa tạo trong truy vấn kế tiếp.
- Hiệu năng với nhật ký lớn (hàng chục nghìn sự kiện) trên WASM và với ảnh món ăn trong payload, vì mỗi lần ghi gửi lại cả file.

Bản Tauri và extension dùng cổng `GoogleAuth` do nền tảng của chúng cài, nên lớp đồng bộ này dùng được nguyên cho chúng. Chỉ bản web được viết và thử ở đây.
