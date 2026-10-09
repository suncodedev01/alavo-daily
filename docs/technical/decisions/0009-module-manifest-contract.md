# 0009 · Module, manifest và hợp đồng

Trạng thái: Đã chọn · Ngày: 2026-10-09

Sản phẩm là một vỏ chung (hub) chứa nhiều ứng dụng con gọi là **module** (hiện có `spending` và `recipes`). Mỗi module tự chứa giao diện, logic engine và bảng dữ liệu, và các module **không import code bên trong nhau**. Chọn vậy để thêm module thứ ba hay thứ tư không làm hai module cũ dính vào nhau, và để sau này có thể gỡ, thay hoặc mở cho bên thứ ba nếu muốn.

Hai cơ chế giữ ranh giới. **Manifest** là bản đăng ký mô tả module với hub (id, tên, icon, màn hình, loại thông báo), và thanh bên, màn Khám phá, chip chuyển ứng dụng đều sinh ra từ danh sách manifest, nên thêm module không phải sửa hub. **Hợp đồng** (`contract.ts` và `contract.rs`) liệt kê đúng những gì module khác được gọi, ví dụ nút "Ghi vào Chi tiêu" của danh sách đi chợ gọi `record_expense` của `spending` chứ không chạm vào bảng của nó.

Bảng dữ liệu có tiền tố theo module (`spending_*`, `recipes_*`, bảng chung `hub_*`) và không truy vấn chéo.

Đánh đổi: mọi tương tác giữa module phải đi qua hợp đồng nên viết thêm một lớp mỏng. Bù lại ranh giới được kiểm tra tự động được (cấm import chéo, cấm vòng phụ thuộc).

Cách bố trí các ứng dụng trên trang chủ và cách chuyển giữa chúng tham khảo cách các super app tổ chức mini app, xem [research/super-app-dieu-huong.md](../research/super-app-dieu-huong.md). Chi tiết quy tắc: `.claude/rules/architecture-modules.md`.
