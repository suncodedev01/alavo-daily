# 0012 · Tiền lưu bằng số nguyên đồng

Trạng thái: Đã chọn · Ngày: 2026-10-09

Mọi số tiền lưu và tính bằng **số nguyên với đơn vị đồng** (`amount_vnd INTEGER`), bọc trong kiểu `Money`, không dùng số thực. Số thực nhị phân không biểu diễn chính xác nhiều giá trị thập phân nên cộng nhiều lần dễ lệch, trong khi VND không có phần lẻ nên số nguyên đủ và chính xác. Hiển thị bằng `Intl.NumberFormat('vi-VN')`.

Số lượng nguyên liệu (ví dụ 0,5 muỗng) là một kiểu khác và có thể là số thực. Tiền ước tính của công thức tính từ giá nguyên liệu rồi làm tròn về đồng, và chỉ thành giao dịch thật khi người dùng bấm ghi vào Chi tiêu.

Đánh đổi: nếu sau này hỗ trợ tiền tệ có phần lẻ (đô la, euro) thì phải đổi sang đơn vị nhỏ nhất của từng loại tiền (cent) và lưu kèm mã tiền tệ. Chưa cần ở phiên bản đầu.
