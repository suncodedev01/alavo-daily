# Rule: Monorepo và Kiến trúc Module (nhiều ứng dụng trong một)

> Alavo Daily là một vỏ chung (hub) chứa nhiều ứng dụng con gọi là **module**. Hiện có `spending` (chi tiêu) và `recipes` (món ăn). Quy tắc dưới đây giữ cho thêm module thứ 3, thứ 4 vẫn không rối.

## Cấu trúc thư mục

```
apps/                Ba vỏ mỏng, chỉ lắp ráp, không chứa màn hình hay nghiệp vụ
  extension/         Tiện ích Chrome MV3 (WXT)
  web/               PWA
  native/            Tauri v2: desktop (Windows, macOS, Linux) và mobile (Android, iOS)
packages/
  engine/            Rust: domain, application, infrastructure, presentation
  client/
    common/          Khởi tạo SQLite WASM, cầu nối TS tới engine, i18n
    design-system/   Primitive UI, thành phần shadcn và token (đồng bộ từ repo design system)
    hub/             Vỏ ứng dụng: Hôm nay, Khám phá, chuyển ứng dụng, thông báo, cài đặt
    modules/
      spending/      Giao diện module chi tiêu
      recipes/       Giao diện module món ăn
mockup/              Bản vẽ HTML tham khảo bố cục, không import vào code thật
```

`pnpm` quản lý workspace, `turbo` chạy build và test theo thứ tự phụ thuộc.

## Một giao diện React dùng chung cho mọi nền tảng

Toàn bộ màn hình, component và logic giao diện nằm trong `packages/client` và được **dùng chung** cho extension, web, desktop và mobile. Thư mục `apps/*` chỉ có điểm vào (`main.tsx`), file lắp ráp (`wiring`) và cấu hình build. Cấm đặt màn hình hay component nghiệp vụ trong `apps/*`. Lý do: nếu một màn hình chỉ có ở một vỏ thì nó thành bản sao lệch dần so với các vỏ còn lại.

Desktop và mobile là **cùng một dự án Tauri** (`apps/native`) với các đích build khác nhau, không tách thành hai app. Nếu sau này cần tách thì chỉ tách thêm một vỏ, giao diện không đổi.

Có hai cách để một giao diện chạy trên nhiều nền mà không rối:

1. **Bố cục quyết định theo chiều rộng, không theo tên nền tảng.** Từ 1024px trở lên dùng khung desktop (thanh bên, các ngăn, bảng ngữ cảnh), dưới 1024px dùng khung điện thoại (thanh điều hướng dưới). Một cửa sổ extension hẹp tự ra khung điện thoại, một điện thoại xoay ngang tự ra khung rộng. Cấm viết `if (isMobile)` hay `if (isExtension)` trong code tính năng.
2. **Khác biệt của nền tảng đi qua cổng (port).** Cổng là một interface do `packages/client/common/src/platform/` định nghĩa. Mỗi vỏ cài đặt đủ các cổng rồi đăng ký trong `wiring`. Code tính năng chỉ gọi cổng, không biết đang chạy ở đâu.

| Cổng | Việc | Web | Extension | Desktop và mobile (Tauri) |
|---|---|---|---|---|
| `EngineClient` | Gọi engine | SQLite WASM + OPFS | SQLite WASM + OPFS | Lệnh Tauri tới `rusqlite` |
| `GoogleAuth` | Lấy quyền Drive | Google Identity Services | `launchWebAuthFlow` | OAuth Desktop + PKCE + loopback |
| `SecureStore` | Cất token | Chỉ trong bộ nhớ | Kho của extension | Keystore hoặc Keychain |
| `Notifier` | Nhắc theo giờ | Theo khả năng của nền | Theo khả năng của nền | Plugin thông báo cục bộ |
| `KeepAwake` | Giữ màn hình sáng khi nấu | Theo khả năng của nền | Theo khả năng của nền | Plugin |
| `Opener` | Mở liên kết ngoài | Trình duyệt | Tab mới | Plugin opener |

Mỗi nền cũng khai báo một bảng **khả năng** (`capabilities`), ví dụ `backgroundReminders: false`. Giao diện hiện hay ẩn một tính năng theo khả năng, không theo tên nền. Ví dụ ô "Nhắc nấu lúc 17:30" chỉ hứa nhắc khi đóng ứng dụng nếu `backgroundReminders` là `true`, còn không thì nói rõ nhắc chỉ hiện khi ứng dụng đang mở.

Extension có thêm một đầu vào nhỏ cho thao tác nhanh (popup ghi chi tiêu). Popup cũng chỉ là một màn hình trong `packages/client`, vỏ extension chỉ mở nó.

## Ranh giới giữa các module

1. **Module không import code bên trong module khác.** `recipes` không được `import` từ `spending/…`. Lý do: nếu cho phép, hai module dính chặt vào nhau và không còn gỡ, thay hay mở cho bên thứ ba được nữa.
2. **Giao tiếp qua hợp đồng công khai** (module contract). Mỗi module xuất một file `contract.ts` và một `contract.rs` mô tả đúng những gì module khác được gọi. Ví dụ `spending` xuất `record_expense(category, amount_vnd, note, source)`, và nút "Ghi vào Chi tiêu" của danh sách đi chợ gọi hàm này, không chạm vào bảng của `spending`.
3. **Mỗi module có bảng riêng, tên bảng bắt đầu bằng tên module** (`spending_transactions`, `recipes_recipes`). Bảng dùng chung của hub bắt đầu bằng `hub_`. Không truy vấn chéo bảng giữa các module, chỉ qua hợp đồng.
4. **Hub chỉ biết module qua một bản đăng ký** (`ModuleManifest`) gồm: id, tên, icon, mô tả, danh sách màn hình điều hướng, bộ thông báo, quy tắc nhắc. Thanh bên, màn Khám phá và chip chuyển ứng dụng đều sinh ra từ danh sách này. Thêm module mới là thêm một manifest, không sửa code hub.
5. **Mỗi module tự quản các thông báo của nó** và đăng ký loại thông báo qua manifest. Hub chỉ gom về một chuông và gắn tên module.

## Thêm một module mới

Làm đủ năm việc, thiếu việc nào thì chưa xong:

1. Tạo `packages/engine/.../features/<module>/` và `packages/client/modules/<module>/`.
2. Viết migration bảng với tiền tố tên module (xem `.claude/rules/database-migrations-rules.md`).
3. Khai báo bảng nào đồng bộ và theo chính sách gộp nào (xem `.claude/rules/sync-rules.md`).
4. Viết `contract.ts` và `contract.rs` cho những gì module khác cần gọi.
5. Đăng ký `ModuleManifest` để hub tự hiện module.

## Quy ước nghiệp vụ dùng chung

- **Tiền** lưu bằng số nguyên đồng (VND không có phần lẻ), không dùng số thực. Hiển thị bằng `Intl.NumberFormat('vi-VN')`.
- **Công thức nấu ăn** lưu nguyên liệu có cấu trúc: số lượng, đơn vị, tên, khu mua. Không lưu một khối chữ. Danh sách đi chợ gộp theo cặp (tên, đơn vị), và đổi khẩu phần nhân tỉ lệ trên số lượng.
- **Chi phí nguyên liệu** nằm trong module `recipes` dưới dạng ước tính. Chỉ khi người dùng bấm ghi vào Chi tiêu mới thành giao dịch thật, và đi qua hợp đồng của `spending`.
