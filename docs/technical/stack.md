# Công nghệ sử dụng

Bảng dưới liệt kê công nghệ theo lớp. Cột "Quyết định" trỏ tới lý do. Không ghi số phiên bản ở đây vì phiên bản thật nằm trong `package.json` và `Cargo.toml`.

| Lớp | Công nghệ | Quyết định |
|---|---|---|
| Kiến trúc dữ liệu | Local-first: dữ liệu nằm trên thiết bị, không có server | [0001](decisions/0001-local-first-khong-server.md) |
| Vỏ ứng dụng | Extension Chrome MV3 (WXT), PWA, Tauri v2 (desktop và mobile) | [0002](decisions/0002-mot-giao-dien-nhieu-vo.md), [0003](decisions/0003-tauri-cho-desktop-va-mobile.md) |
| Giao diện | React 19, TypeScript strict, Vite, Tailwind v4 | [0010](decisions/0010-design-system-shadcn.md) |
| Thành phần giao diện | shadcn (`base-maia`) trên Base UI, icon Phosphor | [0010](decisions/0010-design-system-shadcn.md) |
| Đa ngôn ngữ | i18next, tiếng Việt là mặc định | `.claude/rules/general-code-style.md` |
| Lõi nghiệp vụ | Rust, bốn tầng `domain`, `application`, `infrastructure`, `presentation` | [0005](decisions/0005-engine-rust-bon-tang.md) |
| Cơ sở dữ liệu | SQLite: WASM với OPFS cho web và extension, `rusqlite` cho Tauri | [0004](decisions/0004-sqlite-hai-nen-mot-trait.md) |
| Đồng bộ | Google Drive (`drive.file`), nhật ký sự kiện, đồng hồ lai HLC | [0006](decisions/0006-dong-bo-google-drive.md), [0007](decisions/0007-gop-du-lieu-hlc-nhat-ky-su-kien.md) |
| Đăng nhập Google | Theo nền: Google Identity Services, `launchWebAuthFlow`, OAuth Desktop với PKCE và loopback | [0008](decisions/0008-dang-nhap-google-theo-nen.md) |
| Dữ liệu trong giao diện | TanStack Query, engine trong Web Worker, lệnh JSON | [0013](decisions/0013-engine-trong-worker-va-lenh-json.md) |
| Khung ứng dụng | Màn hình ghép vào khung bằng portal | [0014](decisions/0014-man-hinh-ghep-vao-khung-bang-portal.md) |
| Cấu trúc module | Manifest và hợp đồng giữa các module | [0009](decisions/0009-module-manifest-contract.md) |
| Quản lý repo | pnpm workspace, Turborepo | [0011](decisions/0011-monorepo-pnpm-turborepo.md) |
| Tiền tệ | Số nguyên đồng | [0012](decisions/0012-tien-so-nguyen-dong.md) |
| Kiểm thử, lint | Vitest, Playwright, oxlint hoặc ESLint, clippy | `.claude/rules/clean-code-principles.md` |

## Công nghệ cân nhắc nhưng chưa chọn

- **React Native:** không dùng lại được giao diện React và thành phần shadcn, phải viết lại toàn bộ.
- **CRDT (Automerge, Yjs):** nặng hơn nhu cầu của một người dùng nhiều thiết bị. Xem [0007](decisions/0007-gop-du-lieu-hlc-nhat-ky-su-kien.md).
- **Capacitor:** phương án thay Tauri nếu mobile gặp vấn đề. Chưa tra cứu kỹ plugin SQLite của nó.
