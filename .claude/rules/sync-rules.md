# Rule: Đồng bộ Google Drive (không có server)

> Áp dụng cho `features/sync` ở engine và client. Lý do và nguồn tra cứu của từng lựa chọn nằm ở `docs/technical/decisions/` và `docs/technical/research/`.

## Mô hình tổng quát

Không có máy chủ để phân xử. Vì vậy mọi thiết bị tự giữ **nhật ký sự kiện** của mình, đẩy lên Google Drive của người dùng, và đọc nhật ký của thiết bị khác để tự gộp. Gộp phải cho cùng kết quả dù áp theo thứ tự nào.

1. Mỗi lần ghi vào bảng đồng bộ, engine thêm một dòng vào `hub_delta_events` **trong cùng transaction**: `event_id`, `module`, `entity_type`, `entity_id`, `action` (insert, update, delete), `changed_fields`, `payload_json`, `device_id`, `hlc`, `is_synced`.
2. **Mỗi thiết bị chỉ ghi vào file của chính nó** (`events-<device_id>.json`) và chỉ đọc file của thiết bị khác. Không bao giờ hai thiết bị ghi chung một file. Lý do: Drive không có khoá, hai máy ghi cùng lúc sẽ đè nhau mà không ai biết.
3. Áp sự kiện của thiết bị khác vào SQLite bằng đúng chính sách gộp của bảng đó (mục dưới).

## Đồng hồ: HLC

Đồng hồ trên điện thoại hay lệch, nên "mới nhất thắng" theo giờ thường có thể chọn nhầm bản cũ. Dùng **đồng hồ lai** (hybrid logical clock, HLC): giờ hệ thống kèm bộ đếm, luôn tăng dần trên mỗi thiết bị và tăng theo khi nhận sự kiện từ máy khác. Lưu thành số nguyên 64 bit: 48 bit đầu là mili giây, 16 bit sau là bộ đếm. Mọi cột `updated_at`, `deleted_at` và giá trị trong `field_updated_at` là HLC. Khi cần hiển thị giờ thì dịch phải 16 bit.

## Chính sách gộp, khai báo theo từng bảng

Mỗi bảng đồng bộ khai báo **đúng một** chính sách trong `domain/.../merge_policy.rs`:

- **Theo trường** (`FieldLevel`): mỗi cột có HLC riêng trong `field_updated_at`, hai thiết bị sửa hai cột khác nhau của cùng một dòng thì cả hai thay đổi đều giữ. Dùng cho bảng mà các cột độc lập nhau: tên công thức, ghi chú, danh mục và ghi chú của giao dịch.
- **Cả dòng** (`WholeRow`): bản có HLC lớn hơn thắng toàn bộ dòng. Dùng khi các cột phải đi cùng nhau, vì lấy cột này từ máy A và cột kia từ máy B sẽ tạo ra một giá trị mà không máy nào từng tính. Ví dụ: một khoảng thời gian cùng với ngân sách áp cho khoảng đó.

Cả hai chính sách bắt buộc **giao hoán** (thứ tự áp không đổi kết quả) và **lặp lại được** (áp hai lần không đổi kết quả). Test cho hai tính chất này là điều kiện để merge vào nhánh chính. Nhờ vậy không cần sắp xếp sự kiện theo thời gian và không lo sự kiện dòng con tới trước dòng cha.

## Xoá

Xoá là ghi `deleted_at` (HLC). Nếu có lần sửa **sau** thời điểm xoá thì dòng được khôi phục, ngược lại xoá thắng. **Chưa dọn tombstone** trong phiên bản đầu. Khi cần dọn thì viết chính sách riêng dựa trên mốc xác nhận của từng thiết bị, không tự ý xoá.

## Màn hình xung đột

Với bảng gộp theo trường thì không có xung đột để hỏi, hệ thống tự gộp. Màn "Hai thiết bị cùng sửa dữ liệu" chỉ hiện cho bảng `WholeRow` khi cả hai thiết bị đều có thay đổi chưa đồng bộ. Lúc đó **không tự ghi đè**, hỏi người dùng giữ bản nào. (Màn xung đột trong `mockup/` đang có phương án "Gộp cả hai", cần đổi cho khớp quy tắc này khi dựng thật.)

## Google Drive và đăng nhập

1. Chỉ xin phạm vi `drive.file` (chỉ đọc và sửa những tệp ứng dụng tự tạo). Lưu trong **một thư mục nhìn thấy được** tên "Alavo Daily Backup" ở My Drive, không dùng `appDataFolder`. Lý do: người dùng tự mở, kiểm tra và sao lưu thủ công được. Thư mục ẩn `appDataFolder` thì bị Google xoá khi người dùng gỡ ứng dụng khỏi My Drive.
2. **Bản Tauri (mobile và desktop):** OAuth client loại Desktop kèm PKCE. Mở trình duyệt hệ thống, nhận mã qua máy chủ loopback ngay trên máy (`http://127.0.0.1:<cổng>/`), vì Google không còn chấp nhận custom URI scheme cho client mới. Lưu refresh token để các lần đồng bộ sau chạy ngầm. Sau khi đăng nhập, trình duyệt chỉ hiện trang "quay lại ứng dụng", người dùng tự chuyển về, nên giao diện phải đang chờ sẵn kết quả.
3. **Bản extension:** dùng `chrome.identity.launchWebAuthFlow` (chạy được cả Chrome và Edge, khác với `getAuthToken` chỉ có trên Chrome). Client loại **Web application**, và Google đòi `client_secret` khi đổi mã dù đã có PKCE, nên secret này nằm trong bản build và ai cũng đọc được. Đây là đánh đổi có chủ đích (xem `docs/technical/decisions/0008-dang-nhap-google-theo-nen.md`). Giảm nhẹ bằng cách: chỉ xin `drive.file`, đặt cảnh báo hạn mức trên dự án Cloud, đổi secret nếu thấy bị lạm dụng. **Bản desktop** dùng chung luồng loopback với bản mobile.
4. **Bản web:** Google Identity Services (token model). Không có refresh token và Google không hỗ trợ gia hạn ngầm, nên khi token hết hạn phải có **trạng thái "Cần đăng nhập lại Google" với một nút bấm**, đồng bộ tiếp tục sau khi người dùng bấm.
5. Token và client secret **không bao giờ** được ghi vào log, vào `hub_delta_events`, hay vào file đồng bộ. Native lưu token trong kho khoá của hệ điều hành (Keystore, Keychain). Web chỉ giữ token trong bộ nhớ, không dùng `localStorage`. Client secret của client Desktop được Google coi là công khai, nhưng vẫn không để lộ ra log.

## Thời điểm đồng bộ và cách nói với người dùng

- Đồng bộ chạy **khi ứng dụng đang mở**: sau mỗi lần ghi (có gom lại vài giây), lúc mở ứng dụng, và khi bấm "Đồng bộ ngay". Không có tiến trình chạy ngầm khi ứng dụng đã đóng.
- Giao diện **không được hứa** đồng bộ lúc ứng dụng đóng, và không được chặn thao tác vì đang đồng bộ. Mất mạng là trạng thái bình thường, không phải lỗi.
- Ngắt kết nối chỉ dừng đồng bộ, **giữ nguyên dữ liệu trên máy** và không xoá thư mục trên Drive.

## Việc cần kiểm chứng bằng bản thử trước khi dựng đồng bộ thật

Bản web và bản native dùng hai OAuth client khác nhau. Cần thử xem với `drive.file` hai client có đọc được file của nhau không. Nếu không, thiết kế file phải đổi (ví dụ dùng một client chung hoặc cho người dùng chia sẻ thư mục), và rule này phải cập nhật.
