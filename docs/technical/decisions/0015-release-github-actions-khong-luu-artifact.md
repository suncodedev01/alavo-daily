# 0015 · Build bản phát hành bằng GitHub Actions, không lưu artifact

Trạng thái: Đã chọn · Ngày: 2026-10-09

Workflow `.github/workflows/release.yml` chỉ chạy bằng tay (`workflow_dispatch`). Người chạy chọn mức tăng version (`patch`, `minor`, `major`), tích các bản muốn build (web, Windows, macOS, Linux) và tích môi trường (hiện chỉ có `personal`). Các ô tích là input kiểu `boolean`, nên GitHub vẽ thành checkbox.

Thứ tự chạy: job `plan` tính version kế tiếp và dựng danh sách build từ các ô đã tích (môi trường nhân với bản build), `verify` chạy `cargo test`, typecheck và test của mọi package, `draft` tạo bản phát hành nháp, các job `build` chạy song song và đẩy file vào bản nháp, cuối cùng `publish` commit version mới, gắn tag rồi công bố bản nháp. Nếu một job build hỏng thì `discard_draft` xoá bản nháp và repo không bị đổi gì, vì commit version chỉ được tạo ở bước cuối. Mỗi job `build` khai báo `environment` theo môi trường đã tích, nên secret và biến của môi trường đó chỉ có ở job tương ứng.

**Vì sao không dùng artifact của Actions.** Với tài khoản Free, kho lưu trữ của Actions (artifact và cache cùng một hạn mức) chỉ có 500 MB nếu repo riêng tư, và mặc định artifact giữ 90 ngày. Một bộ cài Windows, macOS, Linux đã vài trăm MB, nên vài lần build là đầy. Xoá artifact không hoàn lại số giờ lưu trữ đã tính trong chu kỳ đó. Vì vậy workflow không dùng `actions/upload-artifact` và đặt `uploadWorkflowArtifacts: false` cho `tauri-action`. File build đi thẳng vào **GitHub Releases**: tài liệu của GitHub ghi mỗi file trong release dưới 2 GiB, không giới hạn tổng dung lượng release và băng thông. Repo này công khai, nên thời gian chạy runner tiêu chuẩn cũng không bị tính. Nếu sau này chuyển sang repo riêng tư thì phút của macOS nhân 10 và Windows nhân 2 trên hạn mức 2000 phút mỗi tháng, nên nên tắt ô macOS khi không cần.

Cache của `pnpm` và `Swatinem/rust-cache` vẫn dùng, vì cache có giới hạn riêng 10 GB và tự xoá bản cũ nhất khi đầy, không bị tính tiền.

**Chưa có trong workflow:** bản Android và iOS (cần `tauri android init`, khoá ký và chứng chỉ Apple), bản extension (chưa có `apps/extension`), ký số cho Windows và macOS (bản build chưa được ký, hệ điều hành sẽ cảnh báo khi mở lần đầu).

**Đánh đổi:** `publish` đẩy commit thẳng lên nhánh đang chạy workflow bằng `GITHUB_TOKEN`. Nếu sau này bật bảo vệ nhánh `main` thì cần cho phép bot này bỏ qua quy tắc, hoặc đổi bước đó thành mở PR.

Nguồn: [Actions billing](https://docs.github.com/en/actions/reference/usage-limits-billing-and-administration), [About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).
