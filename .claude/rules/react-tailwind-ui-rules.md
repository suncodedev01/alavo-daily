# Rule: React 19, Tailwind v4 và Design System (shadcn)

> Áp dụng cho `apps/*`, `packages/client/design-system`, `packages/client/hub`, `packages/client/modules/*`. Nguồn sự thật về giao diện là repo design system dùng chung của tổ chức (đọc `CLAUDE.md` và `design.md` của repo đó trước khi dựng màn mới). File này chỉ chép lại những quy tắc hay bị vi phạm nhất. Khi hai bên khác nhau, repo design system thắng.

## Code React

1. `strict: true` trong tsconfig, không dùng `any`. Mọi props, state, event handler có kiểu rõ ràng.
2. Component là function dùng hook. Không để effect chạy thừa, và không dùng effect cho thứ tính được lúc render.
3. Style bằng class Tailwind v4. Không dùng `style={{...}}` cho thứ Tailwind làm được.
4. **Không viết SQL trong React hay trong service TypeScript.** Mọi thao tác dữ liệu gọi hàm do `@alavo-daily/engine` xuất ra (xem `.claude/rules/rust-engine-rules.md`). Lý do: nếu SQL rải rác ở UI thì không còn đổi được lớp lưu trữ giữa bản native và bản web.
5. **Thành phần lấy từ shadcn** (preset `base-maia`, chạy trên Base UI). Thêm bằng `npx shadcn@latest add <tên>` vào `packages/client/design-system/src/components/ui/`. Thư mục này là **mã vendor, không sửa tay**, để lệnh `add` chạy lại được an toàn. Mặc định của shadcn không hợp thì định nghĩa lại utility trong `index.css`, không sửa file. Base UI dùng prop `render`, không có `asChild` như Radix, nên đọc mã thành phần trước khi dùng. Sau khi thêm hay cập nhật thành phần, chạy kiểm tra ở cả bản web, extension và Tauri.
6. Primitive dùng chung (Button, Card, Badge, Input, Dialog, Popover) chỉ nằm trong `packages/client/design-system`. Không tự dựng lại `<button className="bg-...">` khi đã có `Button`.
7. `className` truyền vào primitive **chỉ chứa class bố cục**: `w-full`, `flex-1`, `shrink-0`, `min-w-0`, margin, `col-span-*`, `truncate`. Cấm `bg-*`, `text-<màu>`, `rounded-*`, `shadow-*`, `border*`, `px-*`, `font-*`. Cần đổi màu theo ngữ nghĩa thì đổi `variant`, cần đổi cỡ thì đổi `size`. Lý do: `className` được nối sau cùng nên đè mất variant, và toàn app không nhận được style mới khi sửa primitive.

8. **Một giao diện cho mọi vỏ** (extension, web, desktop, mobile). Code tính năng không biết mình đang chạy ở đâu: không `if (isMobile)`, không `if (isExtension)`, không gọi `chrome.*`, `window.__TAURI__` hay API riêng của nền. Bố cục chọn theo **chiều rộng** (khung desktop từ 1024px, khung điện thoại dưới 1024px). Thứ cần API của nền (cơ sở dữ liệu, đăng nhập, thông báo, giữ màn hình sáng) đi qua cổng trong `packages/client/common/src/platform/`. Chi tiết ở `.claude/rules/architecture-modules.md`.
9. Màn hình mới phải kiểm tra ở **cả hai khung** (rộng và hẹp), và ở cả khi không có khả năng nền (ví dụ không nhắc khi đóng ứng dụng được).

## Màu, chữ, hình khối

1. **Không viết mã hex hay giá trị tuỳ ý `[...]`** trong code ứng dụng. Chỉ dùng token (`bg-accent`, `text-click-700`, `bg-surface-tint`). Thiếu token thì đặt tên token mới trong `index.css`, đừng viết hai lần.
2. **Năm dải màu, mỗi dải một việc:**
   - `click`: mọi thứ người dùng bấm hoặc được báo trạng thái. Nút chính tô `click-600` với chữ **trắng**, hover **đậm hơn** (`click-700`). Chữ và link dùng `click-700`. `click-500` là màu nhận diện, không dùng làm nền nút hay chữ thân bài.
   - `ozone`: nền và nhận diện, không bao giờ vẽ hành động hay trạng thái.
   - `yellow`: trạng thái đang chờ người dùng quyết định, và cảnh báo.
   - `red`: lỗi, huỷ, nút phá huỷ.
   - `mint`: đã xong, đã xác minh, đã kết nối. **Không bao giờ dùng cho thứ bấm được.**
3. **Mỗi màn hình chỉ có một phần tử màu ấm** (chip "Cần bạn" màu vàng). Không có nút gradient, không có màu nhấn thứ hai. Thanh tiến độ ngân sách màu vàng khi từ 85%, màu đỏ khi vượt, được xem là dữ liệu chứ không phải chrome.
4. **Trạng thái thể hiện bằng nền, không bằng viền.** Hàng đang chọn dùng `bg-accent`, hover dùng `bg-surface-tint`. Viền chỉ dùng cho bảng dày đặc và vòng mảnh quanh thẻ nổi.
5. **Bóng đổ chỉ dùng năm bậc đặt tên** (`shadow-hairline`, `shadow-raised`, `shadow-card`, `shadow-frame`, `shadow-overlay`). Cấm `shadow-md`, `shadow-lg` của Tailwind.
6. **Font là font giao diện của hệ điều hành** (`--font-sans`), không tải font web cho giao diện sản phẩm. Chỉ bốn độ đậm: 400, 500, 600, 700. Cấm `font-light`. Nhãn viết hoa dùng cỡ 11px, đậm 600, giãn chữ `0.1em`.
7. Cỡ chữ lấy từ mười cấp đã đặt tên (`text-display`, `text-title`, `text-sm`, `text-row`, `text-meta`...). Màn dạng trang đầy đủ dùng nền 16px, vùng chrome (thanh bên, menu) dùng 14px.
8. Khoảng cách theo thang 4px (4, 8, 12, 16, 24, 32, 48). Điều khiển bo `rounded-4xl`, ngăn nổi bo `rounded-lg`. Không bao giờ vuông góc.
9. **Icon chỉ dùng Phosphor, nét regular.** Icon cạnh chữ trong nút phải có thuộc tính `data-icon`.
10. Dark mode: dùng token ngữ nghĩa (`bg-card`, `text-muted-foreground`) để tự đảo. Token dải màu như `bg-click-100` giữ nguyên giá trị ở cả hai chế độ, nên nền và chữ đi cùng nhau hoặc không đổi gì.

## Điều khiển và tương tác

1. **Cấm điều khiển gốc của trình duyệt hoặc hệ điều hành:** `<select>`, `<input type="date">`, `<input type="time">`, `alert()`, `confirm()`. Dùng menu, bộ chọn ngày và hộp thoại tự dựng bằng token. Lý do: bản gốc lệch màu, không theo dark mode, và khác nhau theo máy. Bộ chọn tự dựng cần chạy được bằng bàn phím (mũi tên, Enter, Esc).
2. Trạng thái luôn có đủ: đang tải (skeleton), rỗng (kèm hành động), lỗi.
3. Vùng bấm tối thiểu **44px** trên điện thoại. Thanh điều hướng dưới tối đa 5 mục, luôn có nhãn chữ kèm icon.
4. Hộp thoại và bảng kéo lên dùng `shadow-overlay`, đóng được bằng Esc và bấm ra ngoài.
5. Màn **chế độ nấu ăn**: một bước mỗi màn hình, không phải cuộn, chữ bước từ 24px trở lên, nút điều hướng cao tối thiểu 56px, hẹn giờ cập nhật bằng cách đổi đúng phần tử đồng hồ, **không vẽ lại cả màn mỗi giây** (vẽ lại làm nút bấm bị trượt).
6. Chip trạng thái chỉ có một component duy nhất dùng chung. Nhãn tiếng Việt cho từ "NEEDS YOU" của design system tạm là **"CẦN BẠN"**, chờ người phụ trách thiết kế xác nhận.

## Giọng và nội dung chữ

- Chuỗi hiển thị nói **hành động hoặc lợi ích**, không lộ tên công nghệ, giao thức, tên bảng hay tên hàm. Ví dụ viết "Sao lưu dữ liệu lên Google Drive", không viết "Đẩy delta log lên Drive". Tên thương hiệu người dùng đã biết (Google Drive) thì được.
- Người dùng được gọi là "người dùng" hoặc "bạn". Phần việc ứng dụng tự làm thì chủ thể là tên ứng dụng.
- Không dùng từ sáo rỗng như "liền mạch", "cách mạng", "AI-powered".

## Kiểm tra trước khi xong một màn

Chạy `pnpm typecheck`, mở màn trên trình duyệt ở cả chế độ sáng và tối, rồi so với bản vẽ tương ứng trong `mockup/`.
