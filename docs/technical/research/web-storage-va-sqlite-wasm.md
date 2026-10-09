# Lưu trữ trên web và SQLite WASM: những gì đã tra

Ngày tra: 2026-10-09. Phục vụ [0001](../decisions/0001-local-first-khong-server.md) và [0004](../decisions/0004-sqlite-hai-nen-mot-trait.md).

## Chính sách lưu trữ của WebKit (Safari, iOS)

Theo [bài của WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/):

- Mỗi origin dùng được tới 60% dung lượng ổ trong ứng dụng trình duyệt.
- Dữ liệu bị xoá **theo từng origin, nguyên cả origin một lần** khi cần giải phóng chỗ. Origin có trang đang mở hoặc ở chế độ lưu bền vững thì được loại trừ.
- Ứng dụng cài ở Home Screen dùng cùng hạn mức với khi mở trong trình duyệt.
- `navigator.storage.persist()` được cấp **dựa trên heuristic**, ví dụ khi trang được mở từ Home Screen. Trình duyệt vẫn có thể từ chối.

Bài này **không nhắc** giới hạn "7 ngày không dùng thì xoá". Giới hạn đó có trong [diễn đàn Apple](https://developer.apple.com/forums/thread/710157) và các bug WebKit liên quan, kèm các báo cáo mất dữ liệu trên iOS 15 (một bug bị đóng WONTFIX) và ghi chú ứng dụng ở Home Screen có bộ đếm ngày riêng. Đây là nguồn cũ và không chính thức, nên coi là **rủi ro cần phòng** chứ không phải sự thật đã chốt.

## SQLite WASM

Theo [tài liệu của SQLite](https://sqlite.org/wasm/doc/trunk/persistence.md):

- Không có kho lưu bền vững thì cơ sở dữ liệu nằm trong bộ nhớ và **mất khi tải lại trang**.
- Kiểu lưu `opfs` mặc định không chạy trên Safari dưới 17 và cần host trả header COOP và COEP (vì dùng SharedArrayBuffer).
- Kiểu `opfs-sahpool` không cần header và chạy từ Safari 16.4, nhưng chỉ cho **một kết nối**, nên mở tab thứ hai sẽ lỗi.
- Handle OPFS đồng bộ chỉ có trong worker, không mở được trên luồng chính.
- Khi OPFS không dùng được, **đừng lặng lẽ chuyển sang cơ sở dữ liệu trong bộ nhớ**: ứng dụng vẫn chạy nhưng mọi dữ liệu người dùng lưu sẽ mất.
- Gói chính thức là `@sqlite.org/sqlite-wasm`.

Nguồn không xác nhận cơ sở dữ liệu của bản WASM và bản native dùng chung được schema (chung file hay chung tuỳ chọn biên dịch như FTS5). Cần kiểm tra khi dùng tính năng nâng cao.

## Hệ quả đã áp vào thiết kế

- Xin lưu bền vững từ một thao tác của người dùng và kiểm tra `persisted()` mỗi lần mở.
- Dữ liệu chỉ có trên một thiết bị là rủi ro, nên có nút xuất JSON và khuyến khích kết nối Google.
- Chặn hoặc cảnh báo khi mở ứng dụng ở tab thứ hai nếu dùng `opfs-sahpool`.
