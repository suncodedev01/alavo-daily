# Google OAuth và Drive: những gì đã tra

Ngày tra: 2026-10-09. Phục vụ [0006](../decisions/0006-dong-bo-google-drive.md) và [0008](../decisions/0008-dang-nhap-google-theo-nen.md).

## Đăng nhập trên web (Google Identity Services, token model)

Theo [hướng dẫn token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model):

- Access token "có thời hạn ngắn", trang không nêu con số.
- Không có refresh token. Muốn token mới thì gọi `requestAccessToken()` **từ một sự kiện do người dùng thao tác**, ví dụ bấm nút.
- Trang không nói gia hạn ngầm (không cần người dùng) có được hỗ trợ. Một lần tôi từng nói "thường chạy ngầm được" và ý đó **không có trong tài liệu**, đã bị rút lại. Thiết kế giao diện theo hướng cần người dùng bấm.

## Thư mục dữ liệu ẩn (`appDataFolder`)

Theo [tài liệu Drive](https://developers.google.com/workspace/drive/api/guides/appdata):

- Ẩn với người dùng và với ứng dụng khác, chỉ ứng dụng tạo ra nó truy cập được. Cần phạm vi `drive.appdata` (loại không nhạy cảm).
- File trong đó không chia sẻ, không chuyển giữa các "space", không bỏ vào thùng rác được.
- **Bị xoá khi người dùng gỡ ứng dụng khỏi My Drive.**
- Tài liệu không nêu dung lượng hay giới hạn số.

[Hướng dẫn chọn phạm vi](https://developers.google.com/workspace/drive/api/guides/api-specific-auth) khuyến nghị chọn phạm vi hẹp nhất có thể. Tôi chưa xác minh `drive.file` có thuộc loại không nhạy cảm hay không.

## OAuth cho ứng dụng cài đặt (Android, iOS, desktop)

Theo [hướng dẫn ứng dụng cài đặt](https://developers.google.com/identity/protocols/oauth2/native-app):

- Google hỗ trợ PKCE và khuyến nghị phương thức S256.
- "Refresh token luôn được trả về cho ứng dụng cài đặt."
- Custom URI scheme **không còn được hỗ trợ** vì nguy cơ giả mạo ứng dụng.
- Cách loopback (`http://127.0.0.1`) bị ghi là **deprecated cho client loại Android, Chrome app và iOS**, và được khuyến nghị cho ứng dụng desktop (đặt loại ứng dụng là "Desktop app").
- Client loại Android, iOS, Chrome không dùng `client_secret`. Ứng dụng cài đặt được giả định không giữ được bí mật.

## Một cài đặt đã chạy ở dự án nội bộ trước đó

Tài liệu thiết lập của dự án đó (đã đọc ngày 2026-10-09) ghi:

- Dùng `drive.file` và một thư mục nhìn thấy trong My Drive, không dùng `appDataFolder`, để người dùng tự xem và sao lưu được.
- Extension: `chrome.identity.launchWebAuthFlow`, client loại **Web application**. Google đòi `client_secret` khi đổi mã dù có PKCE, nên secret nằm trong bản build. Tài liệu ghi rõ đây là đánh đổi có chủ đích và nêu cách giảm nhẹ. Không dùng `getAuthToken` vì nó chỉ có trên Chrome, Edge sẽ mất đồng bộ.
- Mobile (Tauri): client loại **Desktop app**, mở trình duyệt hệ thống, nhận mã qua máy chủ loopback viết bằng Rust (`tiny_http`), có PKCE, lưu refresh token. Custom scheme bị Google chặn với client mới ("Error 400: invalid_request"). Sau đăng nhập người dùng phải tự quay lại ứng dụng.

Điểm cần chú ý: dự án đó dùng client loại Desktop trên Android, trong khi tài liệu Google ở trên ghi loopback là deprecated cho client Android và iOS. Hiện nó chạy, nhưng nằm ngoài khuyến nghị chính thức.

## Chưa xác minh

- Với `drive.file`, hai OAuth client khác nhau (Web và Desktop) có đọc được file của nhau không.
- Có plugin Capacitor nào lấy được refresh token ngay trên thiết bị mà không cần server. Các kết quả tìm được chỉ là README plugin và blog bên thứ ba, nhiều plugin trả về mã để server đổi token.
- Luồng loopback trên iOS.
