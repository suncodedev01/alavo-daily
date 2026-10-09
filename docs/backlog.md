# Backlog

Cập nhật: 2026-10-09. `[x]` là đã làm xong và có test hoặc đã kiểm tra trên trình duyệt. `[ ]` là chưa làm, hoặc đã viết nhưng chưa chạy thử thật (ghi chú ngay sau mục).

## Nền tảng

- [x] Monorepo pnpm và Turborepo, rule trong `.claude/rules`, tài liệu quyết định kỹ thuật (ADR 0001 đến 0015)
- [x] Engine Rust bốn tầng, giao tiếp bằng lệnh JSON `module.verb`
- [x] SQLite trên máy: `rusqlite` cho native, SQLite WASM lưu vào OPFS cho web (chạy trong Web Worker, chỉ cho một tab mở cùng lúc)
- [x] Migration theo dải version từng module, đồng hồ HLC, xoá mềm, nhật ký sự kiện `hub_delta_events`
- [x] Chính sách gộp dữ liệu theo từng bảng (theo trường, cả dòng), có test giao hoán và lặp lại được
- [x] Design system dựa trên shadcn (`base-maia`, Base UI), có trang showcase
- [x] Giao diện React dùng chung cho mọi vỏ: bố cục chọn theo chiều rộng, khác biệt nền tảng đi qua cổng `PlatformServices`
- [x] Test: engine 630, giao diện 849 (common, design system, hub, chi tiêu, công thức)
- [x] Workflow build bản phát hành: chọn mức bump version, chọn bản build (web, Windows, macOS, Linux, Android), chọn môi trường, đẩy file vào GitHub Releases, không dùng artifact. Đã viết, chưa chạy thử trên GitHub
- [ ] Lint giới hạn kích thước hàm, file, tham số trong CI (rule đã ghi, chưa cấu hình ESLint và clippy)
- [ ] Test end to end bằng Playwright trên bản web thật

## Vỏ ứng dụng

- [x] Web chạy được và đã kiểm tra trên trình duyệt: khung rộng và hẹp, sáng và tối
- [ ] Web: PWA manifest và icon (đang ở nhánh `feat/app-icon` của session khác, chưa gộp)
- [ ] Desktop Tauri: mở cửa sổ thật và kiểm tra (mới `cargo check` và typecheck)
- [ ] Desktop: hộp thoại lưu file khi xuất dữ liệu (đang tải file bằng trình duyệt)
- [ ] Android: build APK và chạy thử (workflow đã có, máy này không có Android SDK)
- [ ] iOS
- [ ] Extension Chrome (`apps/extension`) và popup ghi chi tiêu nhanh

## Hub

- [x] Khung ứng dụng: thanh bên, chuyển ứng dụng, thanh tab dưới, chuông thông báo có chấm chưa đọc
- [x] Màn Hôm nay: bữa tối, chi tiêu hôm nay, đi chợ, thẻ "Cần bạn quyết định", thông báo gần đây, sắp đến hạn, trạng thái lần đầu mở
- [x] Màn Khám phá: tìm kiếm, ứng dụng gần đây, ghim ứng dụng
- [x] Cài đặt: giao diện sáng, tối, theo hệ thống; xuất dữ liệu JSON; nạp dữ liệu mẫu; bật tắt và đổi giờ từng quy tắc thông báo
- [x] Màn trạng thái đồng bộ ở dạng tắt (nói thật là chưa kết nối)
- [x] Thông báo trong ứng dụng khi ngân sách chạm 85% và 100%
- [ ] Đồng bộ Google Drive: đăng nhập, đẩy và nhận nhật ký sự kiện, màn xung đột
- [ ] Nhập dữ liệu từ file đã xuất
- [ ] Đa ngôn ngữ (hiện chỉ tiếng Việt)

## Chi tiêu

- [x] Tổng quan: số dư, thu chi tháng, so với tháng trước, biểu đồ theo ngày, ngân sách, mục tiêu
- [x] Giao dịch: danh sách theo ngày, tìm kiếm, lọc, chi tiết, sửa, xoá; thêm giao dịch có bàn phím số trên điện thoại
- [x] Bộ chọn ngày tự dựng, chạy bằng bàn phím
- [x] Hạng mục: tạo mới kèm biểu tượng và ngân sách, sửa, xoá
- [x] Ngân sách theo hạng mục, thẻ "Cần bạn quyết định" khi gần hết
- [x] Mục tiêu tiết kiệm: tạo, thêm tiền, sửa, xoá
- [x] Ví: tạo, đổi tên, số dư đầu kỳ, xoá
- [x] Hoá đơn định kỳ: tạo, sửa, xoá, hiện sắp đến hạn
- [ ] Giao dịch lặp lại hằng tháng tự sinh ra (mới lưu quy tắc, chưa tự tạo giao dịch)
- [ ] Báo cáo theo khoảng thời gian tuỳ chọn và biểu đồ theo hạng mục
- [ ] Nhập sao kê, xuất CSV

## Món ăn

- [x] Danh sách công thức: tìm kiếm, lọc theo thẻ, yêu thích, chi tiết, đổi khẩu phần, ghi chú, xoá
- [x] Soạn công thức: nguyên liệu có cấu trúc, bước nấu kèm hẹn giờ, dán JSON-LD để điền sẵn
- [x] Thực đơn tuần: lưới theo tuần, thêm và bỏ món, chọn món có tìm kiếm
- [x] Danh sách đi chợ: gộp nguyên liệu theo khu mua, đánh dấu đã có, thêm món tay, ghi vào Chi tiêu
- [x] Ảnh hưởng ngân sách khi đi chợ: thẻ "Cần bạn", tăng ngân sách hoặc giữ nguyên
- [x] Chế độ nấu ăn toàn màn hình: hẹn giờ từng bước, báo khi hết giờ, danh sách nguyên liệu, phím mũi tên, giữ màn hình sáng
- [ ] Thêm ảnh cho công thức (nút đang tắt)
- [ ] Nhập công thức từ link (cần bản native hoặc proxy, vì trình duyệt chặn)
- [ ] Chi phí ước tính khi soạn công thức (công thức tạo từ trình soạn đang có chi phí 0)
- [ ] Gợi ý thực đơn tuần tự động

## Nhắc nhở và thông báo

- [x] Danh sách quy tắc thông báo trong Cài đặt
- [x] Engine: lệnh `recipes.morning_menus` trả món đã lên thực đơn của từng ngày, hoặc một món gợi ý cố định theo ngày khi chưa có món; quy tắc `recipes.morning_menu` mặc định 06:00
- [ ] Nhắc món ăn buổi sáng lúc 6, 7, 8, 9 giờ, hiện trên màn hình khoá (đang làm: phần giao diện và lên lịch)
- [ ] Lên lịch thông báo khi đã đóng ứng dụng trên điện thoại (plugin thông báo của Tauri)
- [ ] Thông báo khi ứng dụng đang mở trên web và desktop (đặt hẹn giờ trong trang)
- [ ] Nhắc nấu bữa tối, nhắc đi chợ, nhắc rã đông (quy tắc đã có nhưng chưa có gì kích hoạt)
- [ ] Nhắc hoá đơn trước 2 ngày, tóm tắt chi tiêu cuối tuần (quy tắc đã có nhưng chưa có gì kích hoạt)
