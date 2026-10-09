# 0007 · Gộp dữ liệu bằng nhật ký sự kiện và đồng hồ lai

Trạng thái: Đã chọn · Ngày: 2026-10-09

Mỗi lần ghi vào bảng đồng bộ, engine thêm một sự kiện vào `hub_delta_events` trong cùng transaction. Các thiết bị đẩy sự kiện lên Drive và áp sự kiện của nhau theo **chính sách gộp khai báo riêng cho từng bảng**: gộp theo trường (hai máy sửa hai cột khác nhau thì cả hai thay đổi đều giữ) hoặc gộp cả dòng (bản mới hơn thắng, dùng khi các cột phải đi cùng nhau). Cả hai chính sách phải giao hoán và lặp lại được, nên không cần sắp xếp sự kiện theo giờ và không lo sự kiện dòng con tới trước dòng cha.

Thứ tự "mới hơn" dùng **đồng hồ lai** (hybrid logical clock, HLC): giờ hệ thống kèm một bộ đếm, lưu thành một số nguyên 64 bit (48 bit mili giây, 16 bit bộ đếm). Lý do là giờ trên điện thoại hay lệch, và các bài về local-first đều chỉ ra "bản có giờ lớn hơn thắng" theo giờ thường có thể chọn nhầm bản cũ.
Xoá là ghi `deleted_at`. Sửa sau xoá thì khôi phục dòng, ngược lại xoá thắng. Chưa dọn các dòng đã xoá (tombstone) ở phiên bản đầu, vì dọn đúng cách cần biết mọi thiết bị đã nhận xoá chưa.

Không chọn CRDT (Automerge, Yjs): đảm bảo hội tụ mạnh nhất nhưng tốn thêm bộ nhớ cho từng bản ghi, và quá nặng cho một người dùng với vài thiết bị. Nếu sau này có nhiều người cùng sửa một dữ liệu (ví dụ ngân sách gia đình) thì mở lại quyết định này.

Hệ quả cho giao diện: với bảng gộp theo trường thì không còn xung đột để hỏi. Màn "Hai thiết bị cùng sửa" chỉ cần cho bảng gộp cả dòng. Xem [research/local-first-sync.md](../research/local-first-sync.md) và `.claude/rules/sync-rules.md`.
