# Backlog

Cập nhật: 2026-10-09. `[x]` là đã làm xong và có test (và đã xem trên trình duyệt khi có ghi chú). `[ ]` là chưa làm, hoặc đã viết nhưng chưa chạy thử thật (ghi chú ngay sau mục). Extension nằm ngoài phạm vi đợt này.

## Nền tảng

- [x] Monorepo pnpm và Turborepo, rule trong `.claude/rules`, tài liệu quyết định kỹ thuật (ADR 0001 đến 0016)
- [x] Engine Rust bốn tầng, giao tiếp bằng lệnh JSON `module.verb`
- [x] SQLite trên máy: `rusqlite` cho native, SQLite WASM lưu vào OPFS cho web (chạy trong Web Worker, chỉ cho một tab mở cùng lúc)
- [x] Migration theo dải version từng module, đồng hồ HLC, xoá mềm, nhật ký sự kiện `hub_delta_events`
- [x] Chính sách gộp dữ liệu theo từng bảng (theo trường, cả dòng), có test giao hoán và lặp lại được
- [x] Design system dựa trên shadcn (`base-maia`, Base UI), có trang showcase
- [x] Giao diện React dùng chung cho mọi vỏ: bố cục chọn theo chiều rộng, khác biệt nền tảng đi qua cổng `PlatformServices`
- [x] Test: engine 940, giao diện 1339 (common, design system, hub, chi tiêu, công thức, native) cộng 53 test Rust của vỏ native
- [x] Workflow build bản phát hành: chọn mức bump version, chọn bản build (web, Windows, macOS, Linux, Android), chọn môi trường, đẩy file vào GitHub Releases, không dùng artifact. Đã viết, chưa chạy thử trên GitHub
- [ ] Lint giới hạn kích thước hàm, file, tham số trong CI (rule đã ghi, chưa cấu hình ESLint và clippy)

## Vỏ ứng dụng

- [x] Web chạy được và đã kiểm tra trên trình duyệt: khung rộng và hẹp, sáng và tối (chưa xem lại các màn mới của đợt này)
- [x] Web: icon và PWA manifest
- [ ] Desktop Tauri: mở cửa sổ thật và kiểm tra
- [x] Desktop: hộp thoại lưu file khi xuất dữ liệu (lệnh Rust `save_text_file`, có test; chưa chạy cửa sổ thật)
- [ ] Android: build APK và chạy thử trên máy ảo (máy có SDK, NDK 27 và JDK 21 ở thư mục cài mặc định; đã tạo được project Android, chưa build)
- [ ] iOS (cần chứng chỉ Apple Developer, chưa có)
- [x] Android: thanh trạng thái sáng (biểu tượng tối trên nền kem) qua `scripts/patch-android-theme.mjs`, và biểu tượng nhỏ trắng của thông báo (`ic_notification`, sinh bằng `scripts/build-android-notification-icon.mjs`)
- [ ] Android: thanh trạng thái chưa đổi theo chế độ tối của ứng dụng. Hiện cả hai chủ đề hệ thống đều dùng thanh sáng vì ứng dụng mặc định sáng. Cần một cầu nối nhỏ để đổi biểu tượng thanh trạng thái khi người dùng chọn chủ đề tối
- [ ] Android: token Google chỉ giữ trong bộ nhớ nên mỗi lần mở app phải đăng nhập lại (chưa có Android Keystore)
- [ ] Android: đăng nhập Google đúng cách của Google (client loại Android với tên gói và SHA-1 của khoá ký, plugin Kotlin dùng `AuthorizationClient`). Luồng loopback hiện dùng cho Android bị Google ghi là deprecated với client Android và chưa được chạy thử với Google thật
- [ ] Extension Chrome (`apps/extension`) và popup ghi chi tiêu nhanh (ngoài phạm vi đợt này)

## Hub

- [x] Khung ứng dụng: thanh bên, chuyển ứng dụng, thanh tab dưới, chuông thông báo có chấm chưa đọc
- [x] Màn Hôm nay: bữa tối, chi tiêu hôm nay, đi chợ, thẻ "Cần bạn quyết định", thông báo gần đây, sắp đến hạn, trạng thái lần đầu mở
- [x] Màn Khám phá: tìm kiếm, ứng dụng gần đây, ghim ứng dụng
- [x] Cài đặt: giao diện sáng, tối, theo hệ thống; xuất dữ liệu JSON; nạp dữ liệu mẫu; bật tắt và đổi giờ từng quy tắc thông báo
- [x] Thông báo trong ứng dụng khi ngân sách chạm 85% và 100%
- [x] Đồng bộ qua Google Drive: engine áp sự kiện từ máy khác theo chính sách gộp, máy khách Drive, bộ điều phối (khi mở, sau khi ghi, mỗi 5 phút, "Đồng bộ ngay"), màn kết nối, đăng nhập lại, xung đột. Đã kiểm với Drive giả và hai máy giả lập hội tụ
- [ ] Kiểm chứng đồng bộ với Google Drive thật (cần OAuth client ID của bạn; chưa biết `drive.file` có cho bản web và bản native thấy file của nhau không)
- [ ] Màn Hôm nay chưa có dòng trạng thái đồng bộ (mới có ở thanh bên và Cài đặt)
- [x] Nhập dữ liệu từ file đã xuất (xem trước số dòng, gộp qua cùng đường áp sự kiện, nhập hai lần không đổi gì)
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
- [x] Giao dịch lặp lại hằng tháng tự sinh ra (`spending.generate_recurring`, không tạo trùng giữa hai máy, có nút "Dừng lặp lại")
- [x] Báo cáo theo khoảng thời gian (Tháng này, 3 tháng, Năm nay, tuỳ chọn) với biểu đồ tròn theo hạng mục và cột theo tháng
- [x] Xuất CSV
- [x] Nhập sao kê CSV: nhận dạng dấu phân cách, cột ngày, số tiền, ghi nợ, ghi có, nội dung; gợi ý hạng mục; bỏ qua dòng đã có

## Món ăn

- [x] Danh sách công thức: tìm kiếm, lọc theo thẻ, yêu thích, chi tiết, đổi khẩu phần, ghi chú, xoá
- [x] Soạn công thức: nguyên liệu có cấu trúc, bước nấu kèm hẹn giờ, dán JSON-LD để điền sẵn
- [x] Thực đơn tuần: lưới theo tuần, thêm và bỏ món, chọn món có tìm kiếm
- [x] Danh sách đi chợ: gộp nguyên liệu theo khu mua, đánh dấu đã có, thêm món tay, ghi vào Chi tiêu
- [x] Ảnh hưởng ngân sách khi đi chợ: thẻ "Cần bạn", tăng ngân sách hoặc giữ nguyên
- [x] Chế độ nấu ăn toàn màn hình: hẹn giờ từng bước, báo khi hết giờ, danh sách nguyên liệu, phím mũi tên, giữ màn hình sáng
- [x] Ảnh công thức: lưu trong SQLite (`recipes_photos`, lệnh `recipes.set_photo`), thu nhỏ còn tối đa 1024 px JPEG ngay trên trình duyệt, hiện làm ảnh bìa
- [x] Nhập công thức từ link trên bản native (lệnh Rust `fetch_page` có chặn địa chỉ nội bộ, đọc JSON-LD kể cả `@graph`; chưa thử với trang thật)
- [ ] Bản web vẫn chưa nhập được từ link (trình duyệt chặn, cần proxy)
- [x] Chi phí ước tính khi soạn công thức: ô giá từng nguyên liệu, tổng và giá mỗi người hiện ngay trong trình soạn
- [x] Gợi ý thực đơn tuần tự động: lệnh `recipes.suggest_plan` (không lưu gì), hộp thoại xem trước, đổi từng món, áp dụng

## Nhắc nhở và thông báo

- [x] Danh sách quy tắc thông báo trong Cài đặt
- [x] Nhắc món ăn buổi sáng: lên lịch 4 lần mỗi sáng (giờ đặt trong Cài đặt rồi mỗi giờ một lần, mặc định 6, 7, 8, 9 giờ) cho 3 ngày tới; ngày chưa có món thì gợi ý một món cố định theo ngày
- [x] Mọi module báo lịch nhắc qua một bộ gom chung (`useReminderSource`), hub lên lịch một lần để không module nào xoá lịch của module khác
- [x] Cổng `scheduleNotifications`: hẹn giờ trong trang cho web và desktop (chỉ hiện khi ứng dụng đang mở), plugin thông báo của Tauri cho điện thoại
- [x] Nút "Cho phép thông báo" trong Cài đặt (web và native)
- [x] Nhắc nấu bữa tối, nhắc đi chợ (Thứ Bảy, khi còn nguyên liệu chưa mua), nhắc rã đông (tối hôm trước món có thịt hoặc cá)
- [x] Nhắc hoá đơn trước 2 ngày, tóm tắt chi tiêu cuối tuần (Chủ Nhật)
- [x] Ngày hiện tại tự đổi lúc nửa đêm và khi tab hiện lại, nên lịch nhắc tự tính lại khi ứng dụng mở qua đêm
- [ ] Kiểm tra thông báo hiện trên màn hình khoá của điện thoại (code và test có rồi; thử trên máy ảo Android là bước kế tiếp)

## Bàn giao từ thiết kế (10/10/2026)

Thứ tự dựng do phiên thiết kế chốt. Mỗi mục xong thì chạy typecheck, test và xem trên trình duyệt thật ở cả sáng và tối.

- [x] Hình thức thanh toán là bảng riêng (`spending_payment_methods`, v107), giao dịch có `payment_method_id`, mặc định "Tiền mặt" không xoá được; form thêm giao dịch có hai ô chọn "Chi từ ví" và "Thanh toán bằng" kèm nút Quản lý
- [x] Số tài khoản ngân hàng (không bắt buộc) của ví loại Tài khoản, chỉ để tra cứu, hiện dạng •••• 8901
- [x] Xoá ví đã có giao dịch: chuyển sang ví khác hoặc xoá luôn giao dịch
- [x] Khung "Khác" theo manifest (`more.sections`, `ModuleView.more`, `QuickAction.tabLabel`): hub vẽ màn Khác dùng chung, thanh tab và thanh bên tự thêm mục "Khác" ở cuối
- [x] Menu Chi tiêu: Tổng quan, Tài khoản, (+ Ghi chép), Báo cáo, Khác; menu Món ăn: Công thức, Thực đơn, (+ Thêm công thức), Đi chợ, Khác
- [x] Component danh sách đổi thứ tự dùng chung (`ReorderList`), đã dùng cho "Hạng mục hiện ở ngoài"; còn dùng cho "Khu mua sắm"
- [ ] Khác của Chi tiêu còn thiếu: Ngày bắt đầu tháng, Mặc định khi ghi chép, Cách hiển thị (đã có: Quản lý hạng mục, Hạng mục hiện ở ngoài, Dự toán, Số tài khoản ngân hàng, Nhắc nhở chi tiêu)
- [ ] Khác của Món ăn còn thiếu: Nhóm món, Nhập công thức, Bữa trong ngày, Khu mua sắm, Ghi chi phí đi chợ, Chế độ nấu ăn, Xuất công thức (đã có: Khẩu phần mặc định, Nhắc nấu ăn)
- [x] Ô "Tự đồng bộ mỗi" (1, 5 mặc định, 15, 30 phút, Tắt) trong tab Đồng bộ Google khi đã kết nối
- [x] Dự toán v2 (thông số nhân, tiền cọc, mức cần thiết, gợi ý bỏ khoản, khoản thu dự kiến), tính toán thuần hàm ở domain; bảng `spending_estimates`, `spending_estimate_factors`, `spending_estimate_items`, `spending_estimate_income`
- [ ] Bộ màu theo mệnh đổi tông toàn app: token `--sticker-tint`, `--sticker-pct`, `--card-bg`, `--card-ring`, `--chrome-bg`, `--sidebar-bg`, `--meter-plain`, `--wash-a`, `--wash-b`
- [ ] Màn Ghi chép dạng lưới "Mục hay dùng 4×2" và hero gradient (chưa có bản vẽ)

