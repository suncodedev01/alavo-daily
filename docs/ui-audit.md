# Quét lỗi giao diện tự động

Script `scripts/ui-audit/run.mjs` mở bản web thật bằng Playwright, nạp dữ liệu mẫu, đi qua mọi màn hình và đo xem có phần tử nào tràn khỏi khung không. Chạy sau mỗi thay đổi giao diện, vì kiểm kiểu và test đơn vị không thấy được chữ lòi ra ngoài nút.

## Chạy

```
pnpm dev:web                      # hoặc để script tự bật máy chủ dev ở cổng 5190
pnpm ui-audit                     # đủ 3 cỡ màn hình x sáng/tối x vi/en (12 tổ hợp, vài phút)
pnpm ui-audit --viewports 320x640 --themes light --languages en --routes settings
```

Trong Git Bash trên Windows, đừng viết dấu `/` đầu cho `--routes` (viết `recipes/list`, không viết `/recipes/list`), vì Git Bash đổi nó thành đường dẫn ổ đĩa và script không khớp màn nào.

Cờ có sẵn: `--url`, `--viewports` (WxH, cách nhau dấu phẩy), `--themes`, `--languages`, `--routes` (lọc theo một đoạn đường dẫn), `--concurrency`, `--max-rows`, `--out`, `--shots` (chụp ảnh các màn có lỗi vào thư mục `--out`), `--all-shots` (chụp mọi màn), `--headed`. Mặc định kết quả nằm ở `.ui-audit/findings.json`. Script thoát với mã 1 khi còn lỗi. Cần bản dev vì script nạp dữ liệu qua `window.__engine`, chỉ có khi chạy `vite` ở chế độ dev.

## Đo những gì

Mỗi màn (và mỗi hộp thoại, menu, bảng kéo mở ra từ nút có `aria-haspopup`, tối đa 6 cái mỗi màn, cộng thêm chuông thông báo) được đo bằng `scripts/ui-audit/browser-audit.js`:

| Loại | Nghĩa |
|---|---|
| `text-outside-box` | Chữ nằm ngoài khung của chính nó, như chữ "Đồng bộ Google" lòi ra khỏi viên thuốc |
| `text-outside-viewport` | Chữ nằm ngoài màn hình theo chiều ngang và không có khung cuộn nào giữ nó lại |
| `h-overflow` | `scrollWidth` lớn hơn `clientWidth` (nội dung rộng hơn khung chứa). Khung cuộn ngang có chủ đích phải mang class `overflow-x-auto` |
| `page-h-scroll` | Cả trang cuộn ngang được |
| `small-target` | Nút hoặc ô nhập dưới 44px trên màn hẹp (dưới 1024px). Vùng bấm mở rộng bằng `::before`/`::after` tuyệt đối và nhãn bọc ô nhập được tính vào |
| `v-clip` | Chữ bị cắt ở đáy hoặc đỉnh khung có `overflow: hidden` (không tính `line-clamp`) |
| `overlap` | Hai nút đè lên nhau. Không tính nút nằm trong lớp cố định khác nhau (thanh dưới đè lên nội dung đang cuộn) |

Chữ bị cắt có chủ đích bằng dấu ba chấm (`text-overflow: ellipsis`) không bị tính là lỗi.

## Đọc kết quả

Bảng gộp các lỗi giống nhau: cột `where` liệt kê các cỡ rộng, chủ đề và ngôn ngữ mà lỗi xuất hiện, cột `selector` có chữ trong phần tử rồi tới đường dẫn CSS rút gọn, cột `measured` là số đo thật. Test cho chính bộ đo nằm ở `scripts/ui-audit/browser-audit.test.mjs` (`pnpm test:scripts`).
