# 0011 · Monorepo pnpm và Turborepo

Trạng thái: Đã chọn · Ngày: 2026-10-09

Một repo chứa mọi vỏ và package, quản lý bằng **pnpm workspace** (nhiều package trong một repo dùng chung phần phụ thuộc) và **Turborepo** (chạy build, test, lint theo đúng thứ tự phụ thuộc và lưu kết quả để lần sau không chạy lại phần chưa đổi). Chọn vì giao diện, engine và bốn vỏ phải đổi cùng nhau, và cấu hình này đã chạy tốt ở một dự án nội bộ trước đó.

Phần Rust có workspace riêng (`Cargo.toml`) cho các crate của engine, và Turborepo gọi cargo khi cần build WASM.

Đánh đổi: cần nhớ hai hệ build (pnpm và cargo) và để chúng nối với nhau đúng thứ tự. Bù lại, đổi một chỗ trong engine thì mọi vỏ thấy ngay trong cùng một lần build.
