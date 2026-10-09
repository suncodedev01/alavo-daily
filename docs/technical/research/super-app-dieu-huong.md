# Super app và mini app: cách tổ chức và điều hướng

Ngày tra: 2026-10-09. Phục vụ [0009](../decisions/0009-module-manifest-contract.md) và thiết kế trang chủ, màn Khám phá, bộ chuyển ứng dụng.

Hầu hết nguồn là blog của nhà cung cấp hoặc agency thiết kế. **Không tìm thấy nghiên cứu đo lường** việc người dùng tìm dịch vụ nhanh thế nào trên trang chủ super app, và không tìm được case study về trang chủ Alipay hay Grab. Phần đề xuất vì vậy có một phần là suy luận.

## Thuật ngữ

"Mini app" và "mini program" gần như là một. "Micro app" thường là tên khác. "Sub app" không có định nghĩa chuẩn. Một [tổng quan học thuật 2024](https://aisel.aisnet.org/amcis2024/adoptdiff/adoptdiff/7) kết luận các khái niệm này chưa thống nhất.

## Tổ chức bên trong

- Ứng dụng chủ lo phần chung (đăng nhập, thanh toán, điều hướng), mini app thừa hưởng ([kiến trúc mẫu của Ionic](https://ionic.io/docs/superapp-starter/getting-started/architecture)).
- Mỗi mini app chạy trong hộp cát riêng, và việc phát hành tách khỏi chu kỳ cập nhật của ứng dụng chủ ([FinClip](https://finclip.com/mop-en/document/overview/how-it-works.html), [Tencent Cloud](https://proxy-hk.tencentcloud.com/document/product/1219/61737)).

## Cách người dùng vào mini app

- **WeChat:** vuốt xuống từ màn hình Chat. Bản 2019 đổi từ danh sách "gần đây" thành màn giống màn hình chính điện thoại, có ô tìm kiếm, nhấn giữ để sắp xếp hoặc xoá ([TechNode](https://technode.com/2019/01/24/wechat-update-shows-its-ambition-to-become-an-operating-system)). Có danh sách ghim "My Mini Programs" (tối đa 50 ở bản 6.7). Một con số 27% lượt vào đến từ thao tác vuốt xuống là của bên thứ ba (Youzan), không phải của Tencent. Nhiều lối vào khác: tab Khám phá, quét QR, chia sẻ trong tin nhắn ([Chozan](https://chozan.co/all-you-need-know-wechat-mini-programs)).
- **Alipay:** lưới 9 ô ở đầu trang chủ và một Trung tâm dịch vụ ([tài liệu Alipay](https://miniprogram.alipay.com/docs/miniprogram/design/service-center)).
- **Zalo:** vào Khám phá rồi Mini Apps, danh mục chia theo lĩnh vực ([Quản Trị Mạng](https://quantrimang.com/cong-nghe/zalo-mini-app-la-gi-cach-dang-ky-zalo-mini-app-204678)).
- **MoMo:** kiểu "ứng dụng trong ứng dụng", có mini app nội bộ lẫn của đối tác ([MoMo Developers](https://developers.momo.vn/v3/docs/app-center/intro/what-is-mini-app/)).
- **Grab, Gojek:** xoay quanh vài dịch vụ cốt lõi, dịch vụ ít dùng rơi vào mục "More". Việc Grab đổi thứ tự theo giờ và thói quen chỉ có trong một blog thiết kế ([Procreator](https://procreator.design/blog/super-app-ui-principles-from-top-global-app/)), chưa xác minh.

## Quy tắc điều hướng và bằng chứng

- Thanh tab cố định: hướng dẫn chính thức của WeChat khuyên 2 đến 5 tab, tốt nhất không quá 4 ([WeChat Design](https://developers.weixin.qq.com/miniprogram/en/design/)). Adobe Spectrum yêu cầu tab luôn có nhãn chữ ([Spectrum](https://spectrum.adobe.com/page/tab-bar-ios)).
- Danh sách thắng lưới trong một thử nghiệm A/B của GOV.UK, nhưng đó là nội dung chữ ([GOV.UK](https://insidegovuk.blog.gov.uk/2025/01/31/rolling-out-simpler-ways-to-navigate-gov-uks-topic-pages/)).
- Icon nhận ra nhanh hơn chữ khi có nhiều mục, nếu các icon khác nhau rõ. Mẫu rất nhỏ (N = 18 và 36) ([Cognitive Research](https://cognitiveresearchjournal.springeropen.com/track/pdf/10.1186/s41235-018-0133-4)).
- Chuyển dịch vụ không mất ngữ cảnh, dùng "More" cho thứ ít dùng, giữ nhãn dễ đoán ([Procreator](https://procreator.design/blog/super-app-ui-design-steps-to-get-it-right/), [Netguru](https://www.netguru.com/blog/super-app-design-balancing-functionality-and-user-experience)).
- Trang chủ tự đổi vị trí theo thói quen khiến cùng một dịch vụ nằm chỗ khác nhau ở mỗi người, khó học và khó hỗ trợ. Các nguồn tự nêu đây là điều cần thử nghiệm.
- Danh sách "gần đây" và "ghim": không có nghiên cứu, chỉ là mẫu thiết kế phổ biến.

## Đã áp vào thiết kế

Trang chủ "Hôm nay" có thanh điều hướng với nút Khám phá ở giữa, màn Khám phá có ô tìm kiếm, gần đây, ghim và danh sách đầy đủ. Ghim chỉ là lớp phím tắt, danh sách đầy đủ luôn có. Cách kiểm chứng gợi ý: kiểm tra bấm đầu tiên (first-click) với vài tác vụ thật và card sort để chốt tên và nhóm.
