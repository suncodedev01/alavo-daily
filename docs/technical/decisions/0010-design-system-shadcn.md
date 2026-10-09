# 0010 · Design system dựa trên shadcn

Trạng thái: Đã chọn · Ngày: 2026-10-09

Giao diện dùng **shadcn** làm nguồn thành phần: preset `base-maia`, chạy trên **Base UI** (không phải Radix), style bằng Tailwind v4, icon Phosphor. shadcn không phải thư viện cài sẵn mà là cách **chép mã nguồn thành phần vào dự án** qua dòng lệnh, nên mã nằm trong repo của mình và sửa được. Token màu, chữ, bóng đổ, bố cục và quy tắc nội dung lấy từ repo design system dùng chung của tổ chức, và các bản mockup đều vẽ theo nó.

Cách dùng shadcn trong repo:

- Thành phần lấy bằng `npx shadcn@latest add <tên>` vào `packages/client/design-system/src/components/ui/`. Thư mục này là **mã vendor**: không sửa tay, để lệnh `add` chạy lại được an toàn. Khi mặc định của shadcn không hợp, chỉnh bằng cách định nghĩa lại utility trong `index.css`, không sửa file.
- Thành phần của riêng mình (Button, Card, StatusChip, Popover, các bộ chọn) nằm cạnh trong `components/`, bọc hoặc ghép từ thành phần shadcn.
- Base UI dùng prop `render`, không có `asChild` như Radix. Phải đọc mã thành phần trước khi dùng, không suy ra API từ Radix.
- Giữ đồng bộ token và quy tắc với repo design system. Khi hai bên khác nhau thì repo design system thắng.

Đánh đổi: phụ thuộc vào một design system bên ngoài, và các thành phần shadcn phải kiểm tra chạy đúng trong extension và Tauri chứ không chỉ trên web. Mọi điều khiển gốc của trình duyệt (`<select>`, ô chọn ngày) bị cấm, thay bằng thành phần tự dựng bằng token.

Chi tiết quy tắc: `.claude/rules/react-tailwind-ui-rules.md`.
