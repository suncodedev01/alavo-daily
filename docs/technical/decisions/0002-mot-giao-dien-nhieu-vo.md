# 0002 · Một giao diện React cho mọi nền tảng

Trạng thái: Đã chọn · Ngày: 2026-10-09

Toàn bộ màn hình và logic giao diện nằm trong `packages/client` và dùng chung cho extension, web, desktop và mobile. Các thư mục `apps/*` chỉ là vỏ mỏng gồm điểm vào, file lắp ráp (`wiring`) và cấu hình build. Chọn như vậy vì một màn hình chỉ tồn tại ở một vỏ sẽ dần lệch khỏi các vỏ còn lại, và bốn bản giao diện gấp bốn lần công bảo trì.

Hai cơ chế giữ cho một giao diện chạy được ở bốn nơi mà không rối. Thứ nhất, bố cục quyết định theo chiều rộng (khung desktop từ 1024px, khung điện thoại dưới đó), không theo tên nền tảng. Thứ hai, khác biệt của nền tảng đi qua **cổng** (port), tức một interface như `EngineClient` hay `GoogleAuth` mà mỗi vỏ tự cài đặt. Mỗi nền cũng khai báo bảng khả năng (`capabilities`) để giao diện biết nên hứa gì, ví dụ nhắc nấu khi đã đóng ứng dụng.

Đánh đổi: mỗi màn hình phải được thiết kế và kiểm tra ở cả hai khung, và có thêm một lớp gián tiếp là các cổng. Bản vẽ trong `mockup/` đã có hai khung tương ứng.

Chi tiết quy tắc: `.claude/rules/architecture-modules.md`.
