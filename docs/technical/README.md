# Tài liệu kỹ thuật

Thư mục này lưu **công nghệ đã chọn, lý do chọn, và những gì đã tra cứu** để người vào sau không phải đoán hay tra lại từ đầu.

## Cấu trúc

- [stack.md](stack.md): bảng công nghệ theo từng lớp, mỗi dòng trỏ tới quyết định tương ứng.
- [decisions/](decisions/): mỗi quyết định kỹ thuật một file, đánh số tăng dần. Đọc theo số thứ tự để thấy hệ thống hình thành ra sao.
- [research/](research/): ghi chú tra cứu có nguồn (tài liệu chính thức, bài viết). Quyết định dựa vào research nào thì trỏ tới file đó.

## Cách viết một quyết định

1. Tạo file `decisions/NNNN-ten-ngan-gon.md` với `NNNN` là số kế tiếp.
2. Viết bằng văn xuôi ngắn: **chọn gì và vì sao** trong một hai câu đầu, rồi đến đánh đổi và việc còn mở. Không cần chia khuôn mục cứng.
3. Ghi trạng thái ở dòng đầu: `Đã chọn`, `Đề xuất` (còn việc cần kiểm chứng), hoặc `Thay thế bởi NNNN`.
4. Cập nhật [stack.md](stack.md) và bảng bên dưới trong cùng commit.
5. **Không sửa lại quyết định cũ khi đổi ý.** Viết quyết định mới, đánh dấu cái cũ là `Thay thế bởi NNNN`. Lịch sử đổi ý cũng có giá trị.

Thuật ngữ nào lần đầu xuất hiện thì được giải thích ngay tại chỗ trong file đó.

## Danh sách quyết định

| Số | Quyết định | Trạng thái |
|---|---|---|
| [0001](decisions/0001-local-first-khong-server.md) | Local-first, không có server | Đã chọn |
| [0002](decisions/0002-mot-giao-dien-nhieu-vo.md) | Một giao diện React cho mọi nền tảng | Đã chọn |
| [0003](decisions/0003-tauri-cho-desktop-va-mobile.md) | Tauri v2 cho desktop và mobile | Đã chọn |
| [0004](decisions/0004-sqlite-hai-nen-mot-trait.md) | SQLite hai nền sau một trait | Đã chọn |
| [0005](decisions/0005-engine-rust-bon-tang.md) | Engine Rust bốn tầng, cấm SQL ngoài engine | Đã chọn |
| [0006](decisions/0006-dong-bo-google-drive.md) | Đồng bộ qua Google Drive | Đề xuất |
| [0007](decisions/0007-gop-du-lieu-hlc-nhat-ky-su-kien.md) | Gộp dữ liệu bằng nhật ký sự kiện và HLC | Đã chọn |
| [0008](decisions/0008-dang-nhap-google-theo-nen.md) | Đăng nhập Google theo từng nền | Đề xuất |
| [0009](decisions/0009-module-manifest-contract.md) | Module, manifest và hợp đồng | Đã chọn |
| [0010](decisions/0010-design-system-shadcn.md) | Design system dựa trên shadcn | Đã chọn |
| [0011](decisions/0011-monorepo-pnpm-turborepo.md) | Monorepo pnpm và Turborepo | Đã chọn |
| [0012](decisions/0012-tien-so-nguyen-dong.md) | Tiền lưu bằng số nguyên đồng | Đã chọn |
| [0013](decisions/0013-engine-trong-worker-va-lenh-json.md) | Engine trong Web Worker, giao tiếp bằng lệnh JSON | Đã chọn |
| [0014](decisions/0014-man-hinh-ghep-vao-khung-bang-portal.md) | Màn hình ghép vào khung ứng dụng bằng portal | Đã chọn |
| [0015](decisions/0015-release-github-actions-khong-luu-artifact.md) | Build bản phát hành bằng GitHub Actions, không lưu artifact | Đã chọn |
| [0016](decisions/0016-giao-thuc-dong-bo-va-nhap-du-lieu.md) | Giao thức đồng bộ qua Drive và nhập dữ liệu | Đã chọn (chưa kiểm chứng với Google thật) |
