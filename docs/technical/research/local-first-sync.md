# Đồng bộ local-first: những gì đã tra

Ngày tra: 2026-10-09. Phục vụ [0007](../decisions/0007-gop-du-lieu-hlc-nhat-ky-su-kien.md).

Các nguồn là bài của cá nhân và công ty ([Marco Bambini](https://marcobambini.substack.com/p/the-secret-life-of-a-local-first), [OMR](https://omr.it.com/blog/offline-first-state-sync-crdts-production/), [TechInterview](https://www.techinterview.org/post/3233474986/design-offline-first-mobile-app/)), không phải nghiên cứu có kiểm chứng. Không tìm được nguồn nào riêng cho Dexie nên cũng không dùng Dexie.

## Điều các nguồn đồng ý

- **Last-write-wins (bản mới hơn thắng)** đơn giản nhất nhưng **mất dữ liệu âm thầm**, và điểm yếu chính là đồng hồ: giờ trên điện thoại hay lệch nên một bản cũ có thể thắng nhầm.
- **Đồng hồ lai (HLC)**, tức giờ hệ thống kèm bộ đếm logic, là cách vá phổ biến. Nó giữ được sự đơn giản của LWW mà không cần CRDT.
- **Đồng hồ theo từng trường** cho phép hai thiết bị sửa hai trường khác nhau của cùng một dòng mà cả hai thay đổi đều giữ. Chỉ khi hai bên sửa **cùng một trường** mới cần chọn bản có đồng hồ lớn hơn.
- **Xoá bằng tombstone** (đánh dấu đã xoá thay vì xoá hẳn) là cách thông thường. Khó nhất trong thực tế là **dọn tombstone** an toàn.
- **CRDT** (Automerge, Yjs) đảm bảo hội tụ mạnh nhất với mọi thứ tự áp, nhưng tốn thêm bộ nhớ cho mỗi bản ghi. Trong một ví dụ, khi một bên xoá và một bên sửa đồng thời thì xoá thắng, nên cần cân nhắc nếu coi xoá là hành động có thể hoàn tác.

## Một thiết kế đã chạy ở dự án nội bộ trước đó

Schema của dự án đó (đọc ngày 2026-10-09):

- Bảng `delta_event_logs` (event_id, entity_type, entity_id, action, payload_json, device_id, timestamp, is_synced).
- Migration v015 thêm `field_updated_at` (JSON ánh xạ tên cột tới thời điểm ghi) và `changed_fields` cho sự kiện. Mục đích: hai thiết bị sửa hai trường khác nhau thì giữ cả hai. Tài liệu ghi rõ kết quả là **giao hoán và lặp lại được**, nên không cần sắp xếp sự kiện theo giờ và không lo sự kiện dòng con tới trước dòng cha.
- **Cố ý không dùng gộp theo trường** cho lịch ôn tập thẻ ghi nhớ (các trường phải đi cùng nhau, lấy trường này từ máy A và trường kia từ máy B sẽ tạo ra một lịch mà không máy nào tính), mà dùng bản mới nhất thắng cho cả dòng.
- Dòng chỉ một thiết bị tạo ra (id nhúng mã thiết bị) thì không có xung đột để giải quyết.

Dự án này khác ở hai điểm: dùng HLC thay cho mili giây thường, và mỗi thiết bị ghi một file sự kiện riêng trên Drive.
