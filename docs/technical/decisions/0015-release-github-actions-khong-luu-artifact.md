# 0015 · Build bản phát hành bằng GitHub Actions, không lưu artifact

Trạng thái: Đã chọn · Ngày: 2026-10-09

Workflow `.github/workflows/release.yml` chỉ chạy bằng tay (`workflow_dispatch`). Người chạy chọn mức tăng version (`patch`, `minor`, `major`), tích các bản muốn build (web, Windows, macOS, Linux, Android) và tích môi trường (hiện chỉ có `personal`). Các ô tích là input kiểu `boolean`, nên GitHub vẽ thành checkbox.

Workflow chỉ có ba job. `plan` tính version kế tiếp, dựng danh sách build từ các ô đã tích (môi trường nhân với bản build) và tạo bản phát hành nháp. Các job `build` chạy song song, mỗi job build một bản và đẩy file vào bản nháp. `finish` chạy sau cùng: nếu mọi bản build xanh thì commit version mới, gắn tag và công bố bản nháp, nếu không thì xoá bản nháp và repo không bị đổi gì, vì commit version chỉ được tạo ở bước này. Workflow không chạy test để tiết kiệm hạn mức build, các kiểm tra chạy ở máy dev trước khi push. Mỗi job `build` khai báo `environment` theo môi trường đã tích, nên secret và biến của môi trường đó chỉ có ở job tương ứng.

**Vì sao không dùng artifact của Actions.** Với tài khoản Free, kho lưu trữ của Actions (artifact và cache cùng một hạn mức) chỉ có 500 MB nếu repo riêng tư, và mặc định artifact giữ 90 ngày. Một bộ cài Windows, macOS, Linux đã vài trăm MB, nên vài lần build là đầy. Xoá artifact không hoàn lại số giờ lưu trữ đã tính trong chu kỳ đó. Vì vậy workflow không dùng `actions/upload-artifact` và đặt `uploadWorkflowArtifacts: false` cho `tauri-action`. File build đi thẳng vào **GitHub Releases**: tài liệu của GitHub ghi mỗi file trong release dưới 2 GiB, không giới hạn tổng dung lượng release và băng thông. Repo này công khai, nên thời gian chạy runner tiêu chuẩn cũng không bị tính. Nếu sau này chuyển sang repo riêng tư thì phút của macOS nhân 10 và Windows nhân 2 trên hạn mức 2000 phút mỗi tháng, nên nên tắt ô macOS khi không cần.

Cache của `pnpm` và `Swatinem/rust-cache` vẫn dùng, vì cache có giới hạn riêng 10 GB và tự xoá bản cũ nhất khi đầy, không bị tính tiền.

**Android:** job chạy `tauri android init` rồi build APK arm64 ngay trên runner (thư mục `gen/android` bị `.gitignore` nên được sinh lại mỗi lần). APK được ký bằng khoá trong secret `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD` và `ANDROID_KEY_ALIAS` của environment. Nếu chưa có secret thì ký bằng khoá tạm và in cảnh báo: APK vẫn cài được nhưng không cập nhật đè lên bản ký bằng khoá khác.

**Chưa có trong workflow:** bản iOS (cần chứng chỉ Apple), bản extension (chưa có `apps/extension`), ký số cho Windows và macOS (bản build chưa được ký, hệ điều hành sẽ cảnh báo khi mở lần đầu).

**Đánh đổi:** `publish` đẩy commit thẳng lên nhánh đang chạy workflow bằng `GITHUB_TOKEN`. Nếu sau này bật bảo vệ nhánh `main` thì cần cho phép bot này bỏ qua quy tắc, hoặc đổi bước đó thành mở PR.

Nguồn: [Actions billing](https://docs.github.com/en/actions/reference/usage-limits-billing-and-administration), [About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).
