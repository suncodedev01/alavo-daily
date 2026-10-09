# 0013 · Engine chạy trong Web Worker, giao tiếp bằng lệnh JSON

Trạng thái: Đã chọn · Ngày: 2026-10-09

Trên web, SQLite WASM và engine Rust cùng chạy trong **một Web Worker**, giao diện chính nói chuyện với worker bằng tin nhắn. Hai thứ phải nằm chung worker vì kho lưu bền vững của trình duyệt (OPFS) chỉ cho truy cập đồng bộ bên trong worker, còn engine Rust gọi SQLite theo kiểu đồng bộ. Trên Tauri, engine chạy ngay trong tiến trình ứng dụng và được gọi bằng `invoke`. Cả hai nằm sau cùng một cổng `EngineClient`.

Mọi tương tác là **một lệnh có tên và hai chuỗi JSON**: `engine_call("spending.record_transaction", payloadJson)` trả về chuỗi JSON hoặc một lỗi JSON `{code, message}`. Lý do chọn một cổng chung thay vì từng hàm `wasm_bindgen` riêng: thêm một lệnh chỉ cần thêm một nhánh ở Rust và một dòng kiểu ở TypeScript (`CommandMap`), không phải viết lại lớp cầu nối cho từng nền. Đánh đổi là mất kiểm tra kiểu giữa hai ngôn ngữ ở ranh giới, nên `CommandMap` là hợp đồng được viết tay và mọi lệnh đều có test ở cả hai phía.

Bốn chi tiết đáng nhớ:

- Đồng hồ HLC dùng mốc 2026-01-01 và 12 bit bộ đếm để giá trị luôn dưới 2^53, vì số nguyên 64 bit lớn hơn sẽ mất độ chính xác khi đi qua một số JavaScript.
- Chỉ một tab được mở ứng dụng. Worker xin một khoá Web Locks, tab thứ hai nhận lỗi `already_open_in_another_tab` thay vì ghi đè lên cơ sở dữ liệu đang mở.
- Khi OPFS không dùng được, worker báo lỗi `storage_unavailable` chứ không chuyển sang cơ sở dữ liệu trong bộ nhớ.
- Dữ liệu đọc ra giao diện qua **TanStack Query**: mọi lệnh làm thay đổi dữ liệu sẽ làm mới toàn bộ truy vấn đang có. Cơ sở dữ liệu nằm trên máy và nhỏ nên làm mới tất cả rẻ hơn việc theo dõi truy vấn nào phụ thuộc bảng nào.
