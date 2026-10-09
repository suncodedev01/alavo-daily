# Đối chiếu app thật với mockup

Bản đối chiếu từng màn hình giữa app (`http://localhost:5190`) và hai bản mockup tĩnh `mockup/web.html` (màn rộng) và `mockup/mobile.html` (màn điện thoại). Chỉ ghi chênh lệch, không sửa code.

Cách làm: mở cả hai bên ở cùng trạng thái, chụp ảnh, rồi đọc kích thước, cỡ chữ, bo góc, màu bằng `getComputedStyle` trên cùng một phần tử logic. Màn rộng đo ở 1440x900, điện thoại ở 390x844. App nạp dữ liệu mẫu bằng `hub.load_demo_data`, giao diện sáng. Hai điều cần nhớ khi đọc:

- Cả mockup lẫn app đang được người khác sửa trong lúc tôi đo. `mockup/web.html` và `mockup/mobile.html` được ghi lúc 21:11 và 21:12 ngày 9/10/2026, và thêm file `mockup/assets/dialogs.js` (hộp thoại ví, khoản định kỳ, mục tiêu, xoá, trạng thái đồng bộ chưa cấu hình, màn lần đầu). App thì có thay đổi trong lúc đo (ví dụ khung Giao dịch ở 1440px được người khác sửa từ tràn ngang thành xuống dòng). Bảng dưới đúng với bản tôi thấy khoảng 21:30 đến 22:00.
- Dữ liệu mẫu của hai bên khác nhau (tên người dùng "Linh Nguyễn" và "Bạn", số giao dịch, số ngày, giá nguyên liệu). Tôi chỉ ghi các khác biệt này ở mức thấp, vì chúng đến từ dữ liệu chứ không phải từ giao diện.

## Tóm tắt

Điều quan trọng nhất: **hệ token giống hệt nhau**. Màu (`--surface`, `--text-*`, `--primary`, `--accent`, `--income-fg`, `--chart-*`...), bo góc (thẻ 14, điều khiển 26, ô nền 10), bóng thẻ, họ chữ và thang cỡ chữ 11/12/14/17/24/38 trùng khớp ở cả chế độ sáng lẫn tối (đã so từng giá trị). Vì vậy cảm giác "không giống mockup" không đến từ màu hay font. Nó đến từ cấu trúc màn hình (thiếu thẻ, thiếu khối, khác bố cục), kích thước một số thành phần, và cả khung điện thoại (cỡ chữ, thanh điều hướng, cách mở thông báo).

Số dòng chênh lệch theo mức độ (cao: khác bố cục thấy rõ, thiếu thành phần hoặc sai hành vi. vừa: sai khoảng cách, kích thước, màu. thấp: chi tiết nhỏ hoặc do dữ liệu):

| Mức | Số dòng |
|---|---|
| cao | 20 |
| vừa | 49 |
| thấp | 83 |

Năm khoảng cách lớn nhất:

1. **Màn Hôm nay không có thẻ "Thực đơn hôm nay" và bố cục khác.** Mockup xếp hai hàng (Bữa tối + Chi tiêu, rồi Thực đơn hôm nay + Đi chợ). App chỉ có một thẻ bữa tối cao chiếm cột trái và hai thẻ xếp chồng ở cột phải. Dòng món cũng thiếu thời gian nấu, độ khó, mũi tên, giờ nhắc và nút "Bắt đầu nấu" nhỏ hơn (44px cỡ chữ 16 so với 36px cỡ chữ 14).
2. **Cột phải (dock) vắng mặt hoặc nghèo hơn ở nhiều màn.** Báo cáo, Nhập sao kê và tab Thông báo trong Cài đặt không có dock trong app, trong khi mockup có. Ngân sách và Mục tiêu có dock nhưng thiếu "Cần bạn quyết định" và "Quy tắc ngân sách" (3 công tắc) hoặc "Đặt tự động"/"Tự động để dành". Giao dịch trong mockup tự chọn dòng đầu nên dock luôn có nội dung, còn app mở ra trạng thái "Chọn một giao dịch" và dock trống.
3. **Màn Chi tiêu rộng có hai lỗi khung.** Ở 1440px, khung bốn ngăn của Giao dịch có header xuống ba dòng (cao khoảng 112px thay vì 48px) và đẩy thẻ chi tiết xuống. Thanh tóm tắt dính đáy của Đi chợ và trình soạn công thức nổi cách đáy 48px, để lộ nội dung chạy ngang phía dưới (mockup đặt padding đáy bằng 0 cho màn này).
4. **Khung điện thoại dùng cỡ chữ nhỏ hơn và bố cục lai màn rộng.** Mockup nâng cỡ chữ dòng lên 16/13/16 (tên, phụ đề, số tiền) và nút lọc lên 44px, app giữ 14/12/14 và 36px. Màn Tổng quan, Ngân sách, Báo cáo, Chi tiết công thức, Thông báo trong app là bản thu hẹp của màn rộng (thẻ số dư 24px, ngân sách thẻ rời, không có vòng tròn, không tab Nguyên liệu/Cách làm, thông báo mở dạng bảng nổi thay vì trang riêng có bộ lọc).
5. **Màn Cài đặt: thứ tự và hình thức khác, thiếu "Giờ yên tĩnh".** Mockup đặt Giao diện, Ngôn ngữ (chọn bằng hai nút) rồi Dữ liệu trên máy lên đầu, trạng thái đồng bộ ở dưới. App đặt trạng thái đồng bộ lên đầu, Giao diện và Ngôn ngữ (một ô xổ xuống) xuống cuối, tab, ô nhập và thẻ đều rộng 640 và căn giữa thay vì 720 căn trái. Mục "Giờ yên tĩnh" (Không làm phiền 22:00-06:30) có ở cả mockup web và điện thoại nhưng app không có.

Màn mockup vẽ mà app **không có hẳn**:

- Hộp thoại "Thêm công thức" với hai lối (dán link hoặc tự nhập) và banner "Đã đọc từ đường dẫn". App có `ImportEntry.tsx` nhưng chỉ hiện khi nền có khả năng `importFromUrl`, trên bản web hiện nút "Công thức mới" đi thẳng vào trình soạn.
- Khung "Giờ yên tĩnh" (Không làm phiền) trong Cài đặt thông báo.
- Mục "Nhập sao kê" trong thanh bên và đếm số trên "Giao dịch" và "Đi chợ" (app có màn nhập nhưng chỉ vào được từ nút trên Giao dịch hoặc gõ đường dẫn).
- Trung tâm thông báo dạng trang riêng có bộ lọc Tất cả / Chi tiêu / Món ăn trên điện thoại (app chỉ có bảng nổi).
- Màn Khám phá dạng danh sách có nút ghim tròn trên điện thoại (app dùng thẻ có nút Mở và Đã ghim).
- Bộ nút chuyển trạng thái đồng bộ để xem thử (Đã kết nối, Đang đồng bộ, Mất mạng, Xung đột, Cần đăng nhập lại): app có các thẻ này trong code nhưng không vào được ở bản dev (xem phần cuối).
- Màn "Màn hình này đang được hoàn thiện" cho ứng dụng Sắp có (app có "Không tìm thấy trang").

Các màn không vào được hoặc không chụp được nằm ở cuối file.

## Đo nhanh: bảng số

| Thông số | Mockup | App |
|---|---|---|
| Cỡ chữ tiêu đề header, tiêu đề thẻ, nhãn viết hoa | 17/600, 17/600, 11/600 | giống |
| Số lớn (số dư) wide | 38/600 | 38/600 |
| Số lớn (số dư) điện thoại | 38/600 | 24/600 |
| Bo góc thẻ, điều khiển, ô nền | 14, 26, 10 | giống |
| Đệm thẻ chính wide | 24 | 24 |
| Chiều cao nút trong dock (nút nhỏ) | 32 | 36 |
| Nút "Bắt đầu nấu" ở Hôm nay | 36, chữ 14 | 44, chữ 16 |
| Icon điều hướng thanh bên | 16 | 20 |
| Đầu thanh bên | 2 dòng ("Hôm nay" + "Alavo Daily" 11px) | 1 dòng |
| Chiều cao một dòng danh sách giao dịch (wide) | 52 (cách nhau 53) | 56 (cách nhau 60) |
| Ô tìm kiếm ở Khám phá | cao 48, rộng 760, căn trái | cao 36, rộng 640, căn giữa |
| Cột nội dung Cài đặt | 720, căn trái | 640, căn giữa |
| Tab Cài đặt | tự co theo chữ (138/101/81) | chia đều 3 cột, mỗi cột 138 |
| Đệm thẻ Giao diện/Ngôn ngữ | 16, nút chọn cao 44 chiếm hết ngang | 24, nút chọn cao 32 co theo chữ |
| Chế độ nấu: cỡ chữ bước | 32 | 38 |
| Chế độ nấu: đồng hồ | vòng 104, số 38, trong thẻ trắng, màu cam `--chart-1` | vòng 140 màu xanh lá, số 24, không thẻ |
| Chế độ nấu: tên nguyên liệu | 18 | 14 |
| Thanh điều hướng dưới (điện thoại) | cao 84, nút giữa 52 | cao 78, nút giữa 52 |
| Dòng danh sách điện thoại: tên/phụ đề/số tiền | 16/13/16, cao 60 | 14/12/14, cao 56 |
| Nút lọc điện thoại | 44 | 36 |
| Ô tìm kiếm điện thoại | 48, chữ 16 | 48, chữ 16 (giống) |

## Khung chung (màn rộng)

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Đầu thanh bên | Ô chuyển ứng dụng có 2 dòng: tên module và "Alavo Daily" (11px, mờ) | Chỉ 1 dòng tên module | thấp | `hub/src/shell/components/WideSidebar.tsx`, `module-navigation/components/ModuleSwitcher.tsx` |
| Icon mục điều hướng | 16px, tô màu theo từng mục (hai tông), chữ 14/500 | 20px, nét xám một màu | vừa | sticker/icon: để agent sticker xử lý. Cỡ icon 20 so với 16 sửa ở `WideSidebar.tsx` |
| Nhóm "Đã ghim" ở Hôm nay | Mỗi dòng có ô sticker 32px, tên và mô tả module (12px, mờ) | Chỉ icon nhỏ và tên, không mô tả | vừa | sticker. `hub/src/shell`, `module-navigation` (thêm dòng mô tả từ manifest) |
| Mục điều hướng Chi tiêu | Có "Nhập sao kê" và số "23" trên "Giao dịch" | Không có "Nhập sao kê", không có số đếm | cao | `modules/spending/src/index.ts` (thêm mục điều hướng), thêm huy hiệu đếm |
| Mục điều hướng Món ăn | "Công thức", "Thực đơn tuần", "Đi chợ" (có số "24") | "Công thức", "Thực đơn", "Đi chợ", "Yêu thích" (không số) | vừa | `modules/recipes/src/index.ts`. Đổi nhãn "Thực đơn tuần" và thêm số. Mục "Yêu thích" là thừa so với mockup web (mockup chỉ có ở thanh dưới điện thoại) |
| Nhóm Ví (Chi tiêu) | Tiêu đề "Ví" cùng dòng với nút "Quản lý"; ví Techcombank, MoMo, tiền mặt (mỗi ví 32px sticker) | Tiêu đề "Ví" riêng, nút "Quản lý ví" nằm cuối dưới dạng mục có icon bánh răng, thứ tự Tiền mặt, Techcombank, MoMo | thấp | `modules/spending/src/wallets` |
| Nhóm "Hôm nay ăn gì" (Món ăn) | Sticker 32px, tên món, nhãn bữa (Trưa, Tối) nằm dưới tên | Icon nét, nhãn bữa nằm bên phải | thấp | `modules/recipes/src/sidebar` (sticker: agent khác) |
| Khoảng cách dọc thanh bên | Đầu 52 rồi mục đầu ở y=52, đường kẻ ở y=136 | Mục đầu ở y=60, đường kẻ ở y=146 (đệm lớn hơn 8 đến 10) | thấp | `WideSidebar.tsx` |
| Chân thanh bên | Avatar ảnh, "Linh Nguyễn", "Gói miễn phí" | Chữ cái "B", "Bạn", "Dữ liệu trên máy này" | thấp | Dữ liệu, bỏ qua |
| Header: nút đồng bộ nhanh | Nút tròn đồng bộ ở Hôm nay, Khám phá, Cài đặt | Không hiển thị khi chưa cấu hình Google | thấp | `hub/src/sync-status` (có thể cố ý, ghi nhận) |
| Header: nút thêm | "Thêm nhanh" luôn có ở nhóm Hôm nay, kể cả Khám phá và Cài đặt | Chỉ có ở Hôm nay | thấp | `Screen` header actions |
| Dock các màn có tab con | Luôn có (kể cả Thông báo, Báo cáo, Nhập sao kê) | Báo cáo, Nhập sao kê, tab Thông báo, màn lần đầu không có dock, nên cũng không có nút bật tắt dock (≡) | cao | Truyền `dock` cho `ReportsScreen`, `ImportStatementScreen`, `NotificationsTab` |
| Chuông thông báo (bảng nổi) | Rộng ~400, tiêu đề + liên kết chữ "Đánh dấu đã đọc" (không viền), 5 thông báo | Rộng 384, nút "Đánh dấu đã đọc" có viền, bị vòng lấy nét đậm vì tự focus, 1 thông báo (dữ liệu) | thấp | `hub/src/notifications`. Bỏ vòng focus tự động ở nút đầu |
| Menu "Thêm nhanh" | Hai mục, ô sticker | Giống | | Không khác |
| Menu chuyển ứng dụng | Rộng 288, có dấu tick ở mục đang chọn | Rộng 240, không có dấu tick | thấp | `module-navigation/components/ModuleSwitcher.tsx` |

## Hôm nay

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Bố cục lưới | Hàng 1: Bữa tối nay (3fr) + Chi tiêu hôm nay (2fr). Hàng 2: Thực đơn hôm nay + Đi chợ (hai cột bằng nhau) | Một thẻ bữa tối cao chiếm 3/5 bên trái. Bên phải xếp chồng Chi tiêu hôm nay và Đi chợ | cao | `hub/src/screens/today/components/TodayScreen.tsx` (`TodayCards`) |
| Thẻ "Thực đơn hôm nay" (Sáng/Trưa/Tối, "Cả tuần") | Có, liệt kê món và thời gian từng bữa | Không có thẻ riêng | cao | Tách thẻ mới từ `TodayMealsCard.tsx` |
| Thẻ Bữa tối: tiêu đề | "BỮA TỐI NAY · NHẮC LÚC 17:30" và nhãn "Món ăn" bên phải | "BỮA TỐI NAY" | vừa | `TodayMealsCard.tsx` |
| Thẻ Bữa tối: dòng món | Ô sticker tròn 36, tên món 14/500, phụ đề "55 phút · 2 người · Dễ", mũi tên, mỗi dòng cách nhau 69 | Ô vuông bo 36 có icon nét, phụ đề chỉ "2 người", không mũi tên, cách nhau 44 | cao | `TodayMealsCard.tsx`, thêm thời gian, độ khó, chevron, bấm mở công thức |
| Nút "Bắt đầu nấu" | 130x36, chữ 14 | 152x44, chữ 16 | vừa | Đổi sang kích thước nút mặc định của mockup |
| Dòng phụ dưới nút | "Còn 3 nguyên liệu chưa mua" | "Còn 5 nguyên liệu chưa mua" (cùng cấu trúc) | thấp | Dữ liệu |
| Chi tiêu hôm nay | "113.000 ₫", "2 giao dịch" | "113.000 ₫", "23 giao dịch trong tháng" (nhãn sai nghĩa: tiêu đề nói "hôm nay" nhưng số đếm là cả tháng) | vừa | `TodayCards.tsx` (`SpendingCard`): đếm giao dịch trong ngày |
| Đi chợ | "24 món", ước tính, thanh tiến độ | Giống, nhưng chữ phụ xuống hai dòng do thẻ hẹp hơn | thấp | Sẽ hết khi đổi lưới |
| Lời chào | "Chào Linh" | "Chào bạn" | thấp | Dữ liệu |
| Dock: "Cần bạn quyết định" | Chip "Cần bạn" nằm ngay sau tiêu đề; nút nhỏ 32px (`Tăng thêm 300.000 ₫` rộng 158) | Chip đẩy sát mũi tên bên phải; nút 36px (rộng 213) | vừa | `TodaySideSections.tsx`, đưa chip sát tiêu đề, dùng nút cỡ nhỏ |
| Dock: "Thông báo gần đây" | 3 dòng, dòng chưa đọc nền vàng nhạt bo 10 và kéo ra sát mép dock, sticker tròn 32 | 1 dòng (dữ liệu), ô icon bo 10 | thấp | sticker |
| Dock: "Sắp đến hạn" | Đóng sẵn, mở ra có 3 khoản và nút "Quản lý khoản định kỳ" | Mở sẵn, 3 khoản, số tiền căn phải; nút "Quản lý khoản định kỳ" có ở Tổng quan nhưng không ở Hôm nay | vừa | Đóng mặc định và thêm nút ở Hôm nay |
| Màn lần đầu (chưa có dữ liệu) | Thẻ trái, ba nút: Thêm giao dịch (chính), Thêm công thức, Nạp dữ liệu mẫu. Dock vẫn hiện (là lỗi của mockup, không phải mục tiêu) | Thẻ căn giữa rộng toàn dòng, chỉ một nút "Nạp dữ liệu mẫu" (chính), không có dock | vừa | `FirstRunState.tsx`: thêm hai nút Thêm giao dịch, Thêm công thức |

## Khám phá

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Khung nội dung | Rộng tối đa 760, căn trái | Rộng 640, căn giữa | vừa | `ExploreScreen.tsx` (`PageColumn`) |
| Ô tìm kiếm | Cao 48, chữ 16 | Cao 36, chữ 14 | vừa | `ExploreScreen.tsx` |
| Hàng "Gần đây" | Có 2 chip (Món ăn, Chi tiêu) có icon | Chỉ hiện khi đã mở module (sẽ trống khi mới cài) | thấp | Hành vi đúng, khác ở dữ liệu |
| Thẻ "Ứng dụng của bạn" | Ô sticker 44, nút "Mở" và "Đã ghim" | Ô sticker 48, nút giống | thấp | `AppCard.tsx` |
| Dock | "Đã ghim (2)" và "Ghim để làm gì" | Giống nhưng dòng cách nhau khít hơn | thấp | |

## Cài đặt

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Thứ tự khối ở tab Đồng bộ | Giao diện, Ngôn ngữ, Dữ liệu trên máy, rồi trạng thái đồng bộ | Trạng thái đồng bộ, Dữ liệu trên máy, Giao diện, Ngôn ngữ | cao | `SettingsScreen.tsx` (hiện chèn `ThemeCard` và `LanguageCard` sau `TabContent`) |
| Giao diện và Ngôn ngữ ở các tab khác | Có ở tab Đồng bộ và Thông báo (không có ở Bộ màu) | Có ở cả ba tab (kể cả Bộ màu) | thấp | `SettingsScreen.tsx` |
| Chọn giao diện | Ba nút chia đều cả chiều rộng thẻ, cao 44, ô icon màu tím | Ba nút co theo chữ, cao 32, icon xám | vừa | `ThemeCard.tsx`, `Segmented` |
| Chọn ngôn ngữ | Hai nút "Tiếng Việt", "English", ô icon xanh | Ô xổ xuống một lựa chọn | vừa | `LanguageCard.tsx` |
| Đệm thẻ Giao diện/Ngôn ngữ | 16 | 24 | thấp | |
| Khung nội dung | 720, căn trái | 640, căn giữa | vừa | `PageColumn maxWidth="detail"` |
| Thanh tab | Tab rộng theo chữ | Ba tab chia đều 138 | thấp | `Segmented` (`inline-grid`) |
| Thẻ đồng bộ chưa cấu hình | Icon ô, "Chưa cấu hình đăng nhập Google", hai đoạn mô tả (đoạn sau: "Nếu xoá dữ liệu trình duyệt hoặc đổi máy, bạn sẽ mất dữ liệu chưa xuất ra") và nút "Xuất dữ liệu" ngay trong thẻ | Icon ô, tiêu đề, một đoạn mô tả, dòng "148 thay đổi trên máy này chưa được đồng bộ"; không có câu cảnh báo mất dữ liệu, không có nút xuất trong thẻ (nút xuất nằm ở thẻ dưới) | thấp | `SyncConnectionCard.tsx` |
| Các thẻ Dữ liệu trên máy | Một khối, ba nút (Xuất, Nhập, Nạp dữ liệu mẫu) | Có, nhưng tiêu đề không có ô icon | thấp | `LocalDataCard.tsx` |
| Dock tab Đồng bộ | "Dữ liệu lưu ở đâu", "Quyền đã xin" (3 dòng), "Thiết bị đã đồng bộ" | "Dữ liệu lưu ở đâu", "Thiết bị" có hiện chuỗi mã thiết bị `829f1885-...` (thuật ngữ kỹ thuật lộ ra người dùng) | vừa | `SyncDock.tsx`. Bỏ ID, thêm "Quyền đã xin" |
| Tab Thông báo: dock | "Thông báo hoạt động thế nào" và "Giờ yên tĩnh" | Không có dock | cao | `NotificationsTab.tsx` |
| Tab Thông báo: khối "Giờ yên tĩnh" | Công tắc "Không làm phiền 22:00 – 06:30" | Không có ở bất kỳ đâu | cao | Cần thêm tính năng (engine và UI) |
| Tab Thông báo: khối xin quyền | Chỉ một dòng nền vàng nhạt có chuông ("Ở bản này, nhắc nhở chỉ hiện khi ứng dụng đang mở...") | Thẻ "Cho phép thông báo" với nút "Cho phép", cộng thêm dòng chú thích có icon "i" | thấp | App nhiều hơn mockup web (mockup di động có thẻ này) |
| Tab Thông báo: ô giờ | Viên thuốc 28px có icon đồng hồ "09:00"; quy tắc tức thời là viên chữ "Khi xảy ra" | Ô chọn dạng xổ xuống cao 36 có viền "09:00 ⌄"; quy tắc tức thời là chữ thường "Ngay khi xảy ra" | vừa | `NotificationsTab.tsx` |
| Tab Thông báo: kẻ ngang giữa quy tắc | Không | Có đường kẻ mảnh | thấp | |
| Tab Bộ màu | Ô năm sinh rộng 120 có placeholder; "Sinh trước Tết" là viên thuốc chữ; năm nút mệnh tròn cao 40 | Ô năm sinh rộng 128; "Sinh trước Tết" là công tắc; năm nút mệnh cao 28 | vừa | `hub/src/palette` |
| Thẻ bộ màu | Bốn mẫu màu xếp 2x2, hai thẻ mỗi hàng | Bốn mẫu xếp một hàng ngang, hai thẻ mỗi hàng | thấp | `palette/components` |

## Chi tiêu: Tổng quan

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Thẻ Tổng số dư | Số dư 38px, hai dòng cuối "Dòng tiền ròng tháng 10 ... +19.629.000" và "Trên 3 ví ... 23 giao dịch", cao 282 | Cùng số dư, nhưng hai ô "Dòng tiền" và "Trên 3 ví" xếp thành hai cột trên đường kẻ; thêm nút "Quản lý ví"; cao 274 | vừa | `OverviewStats.tsx` |
| Thẻ Thu nhập/Chi tiêu | Dòng phụ "2 khoản thu" (icon mũi tên) và "Thấp hơn tháng 9 9% (cùng kỳ 14.200.000 ₫)" | "Chưa có số liệu tháng 9 để so sánh" (dữ liệu mẫu không có tháng 9) | thấp | Dữ liệu. Kiểm tra lại cách hiển thị khi có tháng trước |
| Chi tiêu theo ngày | Cao thẻ 375, biểu đồ cao 260, tiêu đề phụ "Không gồm tiền nhà" | Cao thẻ 388, biểu đồ cao 271, "Không gồm chi phí cố định" | thấp | `DailyChart.tsx` |
| Ngân sách | Dòng tổng và 4 danh mục, thanh mảnh | Giống | | Không khác |
| Giao dịch gần đây | 5 dòng, sticker tròn 36 | Giống (thứ tự khác do dữ liệu) | thấp | |
| Dock | "Cần bạn quyết định" câu có "Bữa sinh nhật 4/10 chiếm 1.150.000 ₫"; "Sắp đến hạn" mở; "Tháng này so với tháng 9" mở sẵn với đoạn mô tả | Không có câu "Bữa sinh nhật"; "Tháng này so với tháng trước" đóng sẵn | thấp | `DockSections.tsx` |
| Mục điều hướng và ví | Xem "Khung chung" | | | |

## Chi tiêu: Giao dịch

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Trạng thái ban đầu | Tự chọn dòng đầu tiên; thẻ chi tiết và dock luôn có nội dung | Chưa chọn: thẻ trống "Chọn một giao dịch", dock trống | cao | `TransactionsScreen.tsx`: chọn sẵn giao dịch đầu trên màn rộng |
| Header (khung 4 ngăn, 1440px) | Tiêu đề = tên giao dịch đang chọn, chỉ có "Thêm giao dịch", chuông, ≡. Không có bộ chọn tháng | Tiêu đề "Giao dịch", bộ chọn tháng, "Nhập sao kê", "Thêm giao dịch", chuông, ≡ nhồi vào ngăn rộng ~424px nên xuống 3 dòng, cao ~112px, đẩy thẻ chi tiết xuống y=122 (mockup: y=56) | cao | `SpendingScreen`, `TransactionsScreen.tsx`: đưa bộ chọn tháng và "Nhập sao kê" vào đầu ngăn danh sách |
| Ngăn danh sách: dòng | Cao 52, nền chọn full-bleed (280-604) | Cao 56 và khoảng cách 4, nền chọn có lề (284-600) | thấp | `TransactionRow.tsx` |
| Ngăn danh sách: số dòng/đầu đề | "Tất cả giao dịch", "23/23", ô tìm và 4 viên lọc | Giống | | Không khác |
| Thẻ chi tiết | Hàng "Ví", "Danh mục", "Ngày", "Lặp lại"; nút Sửa (icon bánh răng), Đổi danh mục, Xoá; nếu lặp lại có dòng "Tự động tạo từ giao dịch lặp lại" | "Thanh toán bằng", "Danh mục", "Ngày", "Lặp lại"; nút Sửa (icon bút), Xoá. Không có "Đổi danh mục" | vừa | `TransactionDetail.tsx` |
| Số tiền chi tiết | 38px đỏ | 38px đỏ | | Không khác |
| Dock | "Ngân sách danh mục" và "Cùng danh mục (4)" | Giống, dòng cách nhau 60 (mockup 52) | thấp | `TransactionDock.tsx` |
| Hộp thoại Xoá | "Xoá giao dịch này?", nút "Xoá giao dịch" | Có (chữ nút chưa kiểm tra) | thấp | Chưa đối chiếu chữ |

### Hộp thoại "Thêm giao dịch" (màn rộng)

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Kích thước và vị trí | Cao 624, giữa màn hình | Cao 744, lệch lên trên (y=80) | thấp | `transaction-form` |
| Ô số tiền | Chữ lớn căn giữa, không viền, đơn vị ₫ ở phải | Ô có khung viền 2px (đang lấy nét), "0" cỡ lớn, ₫ nằm ngoài khung | vừa | `transaction-form/components` |
| Lưới danh mục | Ô sticker 32 và nhãn một dòng, nút "Hạng mục mới" viền ô vuông có dấu + | Ô sticker 48, nhãn dưới ô, "Hạng mục mới" xuống hai dòng, dấu + không khung | vừa | |
| Thanh toán bằng | "Tiền mặt", "Chuyển khoản", "Ví điện tử" (ba phương thức chung) | Tên các ví thật: "Tiền mặt", "Techcombank", "Ví MoMo", xuống hai dòng | thấp | Dữ liệu mẫu có ví riêng. Ghi nhận khi dữ liệu mới theo commit "Chuyển khoản và Ví điện tử" |
| Ngày | Ô tĩnh "Hôm nay, 9/10" | Ô chọn ngày xổ xuống "Hôm nay · 9/10" | thấp | App nhiều hơn (đúng với luật không dùng ô ngày hệ thống) |
| Lặp lại | Không có | Công tắc "Lặp lại hằng tháng" kèm nhãn "ĐỊNH KỲ" | thấp | App nhiều hơn mockup web |
| Nút | "Huỷ", "Lưu giao dịch" | Giống | | Không khác |

### Hộp thoại "Hạng mục mới"

Gần như trùng khớp (cùng khung, lưới 6 biểu tượng, ô ngân sách tuỳ chọn, hai nút). Chỉ khác: biểu tượng chọn là sticker trong app và là icon nét trong mockup (sticker), tiêu đề ô tên không có nhãn riêng ở app.

## Chi tiêu: Ngân sách

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Thẻ "Còn lại tháng này" | 1.929.000 ₫, "Khoảng 88.000 ₫ mỗi ngày..." | Giống ("87.681 ₫") | thấp | Làm tròn khác |
| Thẻ danh mục | Số %, nút bút sửa ở góc | Số %, nút "···" mở menu (Sửa ngân sách, Xoá hạng mục) | thấp | `budgets` |
| Ô "Thêm hạng mục" | Cao 132, dấu + và chữ | Giống, nhưng dấu + nhỏ hơn và chữ thấp hơn | thấp | |
| Dock | "Cần bạn quyết định" và "Quy tắc ngân sách" (3 công tắc: Cảnh báo ở 85%, Chuyển phần dư sang tháng sau, Nhắc cuối tuần) | Chỉ "Nhắc nhở ngân sách" (một đoạn mô tả) và nút "Cài đặt thông báo" | cao | `budgets/components`: thêm thẻ quyết định và công tắc quy tắc. Lưu ý "Chuyển phần dư sang tháng sau" chưa có trong engine |
| Hộp thoại Sửa ngân sách | "Ngân sách Ăn uống", ô tiền, "Đã dùng 2.397.000 ₫ (92%)", nút "Huỷ" "Lưu thay đổi" | Thêm nút "Bỏ ngân sách", "Đã chi 2.397.000 ₫ trong tháng này", nút "Lưu ngân sách" | thấp | Chữ khác |

## Chi tiêu: Mục tiêu

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Nút thêm | Nút viền "Thêm mục tiêu" nằm trong trang, góc phải | Nút chính vàng "Thêm mục tiêu" ở header | thấp | App hợp lý hơn (không có "Thêm giao dịch" thừa). Giữ nhưng báo lại để thống nhất |
| Header | Có bộ chọn tháng và "Thêm giao dịch" (không cần ở màn này) | Không | thấp | Mockup có lỗi thừa |
| Góc thẻ | Nút thùng rác đỏ | Nút "···" (menu Sửa mục tiêu, Xoá mục tiêu) | thấp | |
| Dòng "Còn ..." | "Còn 10 tuần · 20/12" | "Còn 10 tuần · 18/12" | thấp | Dữ liệu |
| Dock | "Gợi ý cho Du lịch Đà Lạt" có hai nút "Đặt tự động", "Để sau"; "Tự động để dành" (Quỹ khẩn cấp, ngày 5, 2.000.000 ₫) | Chỉ đoạn gợi ý, không nút, không "Tự động để dành" | cao | `goals/components`, `recurring`: thêm hai nút và danh sách tự động để dành |
| Hộp thoại Mục tiêu mới | Trường "Tên mục tiêu" có nhãn, "Số tiền cần đạt", "Đã có sẵn", công tắc hạn, ô ngày, câu "cần để dành 2.520.000 ₫ mỗi tháng" | Trường tên chỉ có placeholder (không nhãn), cùng các trường còn lại, không có câu gợi ý khi ở trạng thái tắt hạn | thấp | `goals/components` |
| Xác nhận xoá | Nút "Xoá mục tiêu" | Nút "Xoá" | thấp | |

## Chi tiêu: Báo cáo

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Khung và dock | Cột rộng ~768 + dock ("Xuất ra bảng tính", "Khoảng thời gian") | Không dock, nội dung kéo hết chiều ngang ~1136 | cao | `ReportsScreen`, thêm dock và `PageColumn` |
| Chọn khoảng | Viên thuốc: Tháng này, 30 ngày, 3 tháng, Năm nay (có bộ chọn tháng ở header) | Nút phân đoạn: Tháng này, 3 tháng, Năm nay, Tuỳ chọn (không có "30 ngày") | vừa | `reports/components` |
| Nút xuất | Nút viền "Xuất ra bảng tính" cùng hàng với lọc | Nút ở góc phải hàng dưới | thấp | |
| Ba ô KPI | Không có | "Thu nhập", "Chi tiêu", "Chênh lệch thu chi" | thấp | App nhiều hơn |
| Vòng tròn | Có tâm "Tổng chi 12.871.000 ₫", 7 màu, danh sách bên phải có sticker, % và số tiền | Vòng không có chữ ở tâm, 6 màu, danh sách chỉ có chấm màu; có công tắc Chi tiêu/Thu nhập | vừa | `reports/components` (sticker cho danh sách) |
| Biểu đồ tháng | "CHI THEO THÁNG", 6 cột T5-T10 có nhãn giá trị ("11,8tr") và chú thích "Các tháng trước là dữ liệu mẫu" | "Thu chi theo tháng", hai cột Chi/Thu của riêng T10, không nhãn giá trị | vừa | Cần dữ liệu nhiều tháng |
| Bảng hạng mục | "Bảng hạng mục": Hạng mục, Đã chi, Tỷ lệ, Giao dịch | "Chi tiết theo hạng mục": Hạng mục, Giao dịch, Tổng, Tỷ lệ (thứ tự cột khác) | thấp | |

## Chi tiêu: Nhập sao kê

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Vào màn | Mục trong thanh bên | Không có mục trong thanh bên; có nút "Nhập sao kê" ở header Giao dịch và liên kết "‹ Giao dịch" ở đầu màn | vừa | Xem "Khung chung" |
| Khung và dock | Cột 720 căn trái, dock "Cách nhập" (4 bước) và "Dữ liệu của bạn" | Cột 640 căn giữa, không dock | cao | `statement-import/components/ImportStatementScreen.tsx` |
| Thẻ | Có ô icon tải lên bên trái tiêu đề; nút "Chọn file sao kê" là nút chính vàng; "Đọc sao kê" là nút viền | Không có ô icon; "Chọn file sao kê" là nút viền; "Đọc sao kê" là nút chính (mờ khi chưa dán) | vừa | |
| Header | Có bộ chọn tháng và "Thêm giao dịch" | Không có | thấp | Mockup thừa |
| Màn xem trước | Danh sách mẫu "Xem trước · N giao dịch tìm thấy" kèm nút "Nhập N giao dịch" | Không chụp được (cần tệp) | | Xem phần cuối |

## Chi tiêu: ví, khoản định kỳ và các hộp thoại khác

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Quản lý ví | Danh sách: sticker, tên, loại, số dư căn phải, hai nút bút/thùng rác; ghi chú "Chỉ xoá được ví chưa có giao dịch nào" và nút "Đóng" + "Thêm ví" | Có nút đóng (X), mỗi dòng "Loại · số dư" trên một dòng phụ, nút bút/thùng rác nhỏ; không có ghi chú; chỉ nút "Thêm ví" | thấp | `wallets` |
| Khoản định kỳ | "Khoản định kỳ" với 3 dòng "Ngày 12 hằng tháng" và số tiền | Có, chữ gần giống | thấp | `bills` |
| Hộp thoại Xoá công thức, Nhập dữ liệu | Có | Không đối chiếu từng chữ (Nhập dữ liệu cần tệp) | | |
| Ghi khoản chi đi chợ | Tiêu đề "Ghi khoản chi", chọn danh mục (Ăn uống, Mua sắm, Nhà ở) và "hình thức thanh toán" | Tiêu đề "Ghi vào Chi tiêu", chỉ có thanh toán (Tiền mặt) và danh mục Ăn uống | thấp | `modules/recipes/src/logged-expenses` |
| Gợi ý thực đơn | Danh sách 4 bữa đề xuất có "Đổi món", nút "Gợi ý lại tất cả" và "Áp dụng" | Với dữ liệu mẫu hiện "Các bữa bạn chọn trong khoảng này đã có món rồi", chỉ "Gợi ý lại" | thấp | `plan` |

## Món ăn: Công thức (danh sách + chi tiết)

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Header ngăn danh sách | "Công thức" và "8/8" | Không có (ô tìm đứng đầu), dòng "8/8 công thức" nằm dưới các viên lọc | thấp | `RecipeListPane.tsx` |
| Dòng công thức | Tên + "55 phút · Dễ"; tim ở phải; cao 52 | Tên + "55 phút · Dễ · 34.500 ₫" (thêm giá); cao 58 | thấp | App nhiều hơn |
| Tiêu đề trang (header) | Tên công thức | "Công thức" | thấp | |
| Nút trên header | "Thêm công thức" (mở hộp thoại hai lối) | "Công thức mới" (vào thẳng trình soạn) | vừa | Xem mục cuối |
| Ảnh bìa | Có nút "Thêm ảnh" viền nằm trong bìa | Không có nút trong bìa | thấp | `RecipeParts.tsx` |
| Hàng thông tin | Bốn ô nền nhạt (Chuẩn bị, Nấu, Khẩu phần có nút -/+, Độ khó) | Chữ trơn một hàng, không ô nền | vừa | `RecipeDetail.tsx` |
| Hàng nút | "Bắt đầu nấu", "Thêm vào thực đơn", "Thêm vào đi chợ" | Giống | | Không khác |
| Bảng nguyên liệu | Có đường kẻ mảnh giữa dòng, cao dòng 36.5 | Không kẻ, cao 35 | thấp | `RecipeParts.tsx` |
| Dock: Chi phí | "35.000 ₫", "Bằng 17% số tiền còn lại..." | Giống | | Không khác |
| Dock: Dinh dưỡng | Ô icon lửa + "420 kcal" + "Ước tính theo nguyên liệu" | Chỉ chữ "460 kcal" | thấp | `RecipeDock.tsx` |
| Dock: Ghi chú | Ô chữ, không nút lưu | Ô chữ + nút "Lưu ghi chú" | thấp | App nhiều hơn |
| Dock: nút cuối | "Xoá công thức" | "Sửa công thức" và "Xoá công thức" | thấp | App nhiều hơn |
| Mục "Yêu thích" trong điều hướng | Không (web) | Có | thấp | Xem Khung chung |

## Món ăn: Trình soạn công thức

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Lối vào dán link | Hộp thoại "Thêm công thức": ô link + "Nhập công thức" + "Tự nhập công thức"; sau khi đọc có banner "Đã đọc từ đường dẫn" | Không có trên bản web (chỉ hiện khi nền có khả năng `importFromUrl`) | cao | `editor/components/ImportEntry.tsx`, bật khả năng ở vỏ web hoặc cho hiện ô link kèm trạng thái |
| Thông tin chung: thời gian, khẩu phần | Một hàng 3 ô: phút chuẩn bị, phút nấu, "N người" có -/+ | Ba hàng riêng (phút chuẩn bị và phút nấu cạnh nhau, khẩu phần xuống hàng dưới) | vừa | `editor/components` |
| Ảnh | Vùng kéo thả viền đứt, ô dấu +, nút "Chọn ảnh" | Dòng chữ "Ảnh được thu nhỏ và lưu ngay trên máy..." và nút "Thêm ảnh" | thấp | |
| Dòng nguyên liệu | Một hàng: Số lượng, Đơn vị (xổ xuống), Tên, "Mua ở" (viên thuốc), thùng rác; có tiêu đề cột | Chia hai hàng: (SL, đơn vị, tên, khu) rồi (Giá ước tính, thùng rác); không tiêu đề cột; ô "Giá ước tính" thêm mới | vừa | `editor/components` |
| Danh sách kiểm tra (dock) | Ba mục bắt buộc: Có tên món, Ít nhất 1 nguyên liệu có tên, Ít nhất 1 bước; nút Lưu khoá đến khi đủ | Mục đầu bắt buộc, hai mục còn lại "thêm sau cũng được"; nút Lưu chỉ cần tên | vừa | Quyết định sản phẩm: mockup bắt buộc đủ ba |
| Dock | "Kiểm tra trước khi lưu", "Tóm tắt", "Mẹo nhập nhanh" | Thêm "Chi phí ước tính" | thấp | App nhiều hơn |
| Mục điều hướng đang chọn | "Công thức" sáng | Không mục nào sáng | thấp | `modules/recipes` điều hướng |
| Thanh Huỷ/Lưu | Dính đáy, sát mép | Nổi cách đáy 48px, để lộ nội dung phía dưới | vừa | Xem "Thanh tóm tắt dính đáy" ở Đi chợ |

## Món ăn: Thực đơn tuần

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Header | "Thêm công thức" chính; "Gợi ý thực đơn" và "Tạo danh sách đi chợ" ở trong trang | "Gợi ý thực đơn" ở header; "Tạo danh sách đi chợ" nằm cuối dock | thấp | `plan/components` |
| Ô lưới | Mỗi ô có nút "+" viền, món là chip nền nhạt | Ô là nền nhạt, "+" không viền; hôm nay tô vàng cả cột | thấp | |
| Cột hôm nay | Chỉ tiêu đề cột vàng | Tiêu đề cột vàng và chip vàng | thấp | |
| Dock | "Tuần này 13/21", "Cần bạn quyết định" (chip cạnh tiêu đề), "Món ăn nhiều nhất" | "Tuần này 13/21", "Ảnh hưởng đến ngân sách" (chip dưới đoạn văn), "Món ăn nhiều nhất"; thiếu "cho 2 người" | vừa | `plan/components`, đổi tên mục và vị trí chip |

## Món ăn: Đi chợ

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Khung | Cột 720 căn trái | Cột 640 căn giữa | thấp | |
| Tiêu đề | "Cần mua cho 9 – 11/10" | "Cần mua từ 9/10 đến 11/10" | thấp | |
| Dòng món | Cao 53 có đường kẻ mảnh, tên món cỡ 14, nguyên liệu có tổng gộp | Cao 52 không kẻ | thấp | `shopping/components` |
| Thanh tóm tắt dính đáy | Sát đáy cột nội dung; có thêm nút "Chọn danh mục" | Nổi cách đáy 48px do `padding-bottom: 48px` của vùng cuộn, thấy dòng thứ nhỏ phía dưới thanh; chỉ nút "Ghi vào Chi tiêu" | vừa | Mockup đặt `paneBody.paddingBottom = 0` khi ở Đi chợ. `shopping/components/SummaryBar.tsx` và `Screen` cần cờ bỏ padding đáy |
| Dock | "Ảnh hưởng đến ngân sách" (chip cạnh tiêu đề) và "Từ những món nào (6)" | Giống nhưng chip nằm dưới đoạn văn | thấp | |

## Món ăn: Chế độ nấu

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Đồng hồ | Thẻ trắng chứa vòng 104 (màu cam `--chart-1`), số "05:00" 38px, nút "Bắt đầu hẹn giờ" cao 48 và nút làm lại 48 | Vòng 140 màu xanh lá có số 24px bên trong, không thẻ, nút cao 44 chữ 16 | vừa | `cooking/components/StepTimerPanel.tsx`. Lưu ý quy tắc: mint dành cho "đã xong", không nên dùng cho đồng hồ đang chạy |
| Chữ bước | 32px | 38px | thấp | `CookingSession.tsx` |
| Cột nguyên liệu | Rộng 360 (x 1056), tên 18px, có kẻ giữa dòng | Rộng 453 (x 963), tên 14px, không kẻ | vừa | `IngredientChecklist.tsx` |
| Nút Bước trước/Bước tiếp | 178x56 và 164x56 | 156x56 và 143x56 | thấp | `CookingFooter.tsx` |
| Chip bước đang chạy, banner hết giờ | Có ("Bước 2 · 04:12", "Hết giờ: ...", nút "Đã rõ") | Không kiểm chứng được (cần chạy đồng hồ) | | |

## Điện thoại (390x844)

Khác biệt chung trước, rồi theo từng màn. Ảnh mockup điện thoại là một khung điện thoại có thanh trạng thái giả, không phải phần của app.

| Phần tử | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Cỡ chữ dòng danh sách | Tên 16/500, phụ đề 13/400, số tiền 16/500, dòng cao 60 | 14/500, 12/400, 14/500, dòng cao 56 | vừa | Thang chữ riêng cho `max-lg` trong `design-system` |
| Nút lọc | Cao 44 | Cao 36 | vừa | Luật vùng bấm tối thiểu 44px |
| Thanh điều hướng dưới | Cao 84, icon 24, nhãn 11, icon tô màu theo mục, nền vàng nhạt cho mục đang chọn | Cao 78, icon xám, nền vàng nhạt cho mục chọn, nút giữa 52 | thấp | `hub/src/shell/components/TabBars.tsx` (tô màu icon: sticker) |
| Thanh trên cùng | Viên "module" + chuông. Bên trong module không có nút thêm; một số màn có nút đồng bộ (cloud) | Viên "module" + chuông; màn Hôm nay có thêm tiêu đề "Hôm nay" lặp lại và nút "Thêm nhanh" | vừa | `Screen` điện thoại |
| Tiêu đề trang | 24/600 dưới thanh trên, không có hành động bên phải | 24/600 kèm nút hành động bên phải (Thêm mục tiêu, Công thức mới...) | thấp | Hành vi hợp lý của app, ghi nhận |
| Bộ chọn tháng | Chỉ ở Tổng quan, Ngân sách | Ở Tổng quan, Giao dịch (cùng nút xuất) | thấp | |

| Màn | Mockup | App | Mức | Gợi ý sửa |
|---|---|---|---|---|
| Hôm nay | "Chào Linh" + ngày; thẻ bữa tối có hàng món kèm thời gian, độ khó và mũi tên, nút "Bắt đầu nấu" rộng hết thẻ cao 48; rồi "Cần bạn quyết định", rồi Chi tiêu hôm nay | Thêm tiêu đề "Hôm nay" lặp lại và nút "Thêm nhanh"; dòng món chỉ có "2 người"; nút "Bắt đầu nấu" co theo chữ 152x44. Thứ tự thẻ giống nhau | vừa | `TodayScreen.tsx` |
| Khám phá | Tiêu đề "Khám phá" + chuông, hàng "Gần đây", khối "Ứng dụng của bạn" là danh sách dòng có nút ghim tròn 44, "Sắp có" | Thanh trên + tiêu đề, "Ứng dụng của bạn" là hai thẻ có nút "Mở" và "Đã ghim" | vừa | `ExploreScreen.tsx`, `AppCard.tsx` |
| Chuyển ứng dụng (sheet) | Không có nút đóng, mục chọn có dấu tick | Có nút X (đang bị vòng lấy nét đậm vì tự focus), không tick | thấp | `ModuleSwitcher.tsx` |
| Trung tâm thông báo | Trang riêng có "‹ Quay lại", bộ lọc Tất cả / Chi tiêu / Món ăn, "Đã đọc hết", thẻ danh sách 5 thông báo, hàng "Cài đặt thông báo" | Bảng nổi từ đáy: tiêu đề "Thông báo", "Đánh dấu đã đọc", danh sách, nút "Cài đặt thông báo"; không bộ lọc | cao | `hub/src/notifications` |
| Cài đặt thông báo | Trang con có nút "‹ Cài đặt" và tiêu đề "Thông báo": thẻ cho phép thông báo nền vàng, thẻ module, mỗi quy tắc có ô giờ cao 44 xếp dưới | Nằm trong tab "Thông báo" của trang Cài đặt có thanh tab (chữ "Đồng bộ Google" bị xuống hai dòng); ô giờ xổ xuống; không có "Không làm phiền" | vừa | `NotificationsTab.tsx` |
| Cài đặt (gốc) | Danh sách các mục dẫn đến trang con (Giao diện, Bộ màu, Dữ liệu, Đồng bộ Google...) | Một trang có thanh tab ba tab, các thẻ xếp dọc | cao | Điều hướng khung điện thoại: dùng ngăn xếp trang con như mockup |
| Bộ màu | Trang con có nút "‹ Cài đặt" và tiêu đề "Bộ màu" | Tab "Bộ màu"; ô năm sinh nhỏ, công tắc "Sinh trước Tết" | thấp | |
| Tổng quan | "Chào Linh" + ngày; thẻ số dư 38px với hai ô nhỏ Thu/Chi bên dưới; thẻ "Cần bạn quyết định"; "Giao dịch gần đây" | Tiêu đề "Tổng quan" + bộ chọn tháng; số dư 24px; thẻ Thu và Chi tách riêng; không lời chào | cao | `OverviewStats.tsx` (cỡ số, bố cục điện thoại) |
| Thêm giao dịch | Trang đầy màn hình: tab Chi/Thu, số tiền 38px, hàng chip danh mục cuộn ngang, ghi chú, "Thanh toán bằng", "Hôm nay", "Một lần", bàn phím số, nút "Lưu" | Sheet từ đáy có X, tab, số tiền, chip danh mục, ghi chú, thanh toán (theo ví thật), ngày xổ xuống, bàn phím số, hai nút "Huỷ" và "Lưu giao dịch" | vừa | `transaction-form` |
| Giao dịch | Tiêu đề, ô tìm 48, viên lọc (Tất cả, Chi, Thu, Định kỳ, Ví MoMo), mỗi ngày một thẻ | Có nút xuất và bộ chọn tháng, "Tất cả giao dịch 23/23", viên lọc không có "Ví MoMo" | vừa | `TransactionListPane.tsx` |
| Ngân sách | Vòng tròn 188 "Còn lại 1.929.000 ₫, 74% đã dùng" rồi một thẻ chứa mọi danh mục, mỗi dòng có thanh | Thẻ tóm tắt thanh ngang và mỗi danh mục một thẻ riêng | cao | `budgets/components` |
| Mục tiêu | Nút "Thêm tiền" rộng hết thẻ (nền vàng nhạt) | Nút "Thêm tiền" co theo chữ; nút "Thêm mục tiêu" ở header | thấp | |
| Báo cáo | Viên khoảng thời gian, hai ô ngày "Từ" "Đến", thẻ vòng tròn có tâm "Tổng chi", danh sách có sticker, bảng, nút xuất cuối | Phân đoạn, nút xuất, ba ô KPI, thẻ có công tắc, vòng không tâm | vừa | `reports/components` |
| Nhập sao kê | Ô icon, nút chính "Chọn file sao kê", ô dán; "Đọc sao kê" viền | Liên kết "‹ Giao dịch", nút viền, ô dán, "Đọc sao kê" chính | thấp | |
| Công thức (danh sách) | Thẻ từng công thức: ô vuông 56 có icon, tên 16, "55 phút · Dễ · 35.000 ₫", tim; viên lọc cuộn ngang | Danh sách gọn: sticker tròn, tên, phụ đề, tim; viên lọc xuống hai hàng; nút "Công thức mới" ở header | vừa | `RecipeListPane.tsx` |
| Chi tiết công thức | Ảnh bìa tràn mép có nút "‹" và tim phủ lên; ba ô thông tin; thẻ "Khẩu phần" có giá; tab Nguyên liệu / Cách làm; thanh dưới "Thêm vào thực đơn" + "Bắt đầu nấu" | Ảnh bìa trong khung, nút "‹" riêng ở trên; thông tin chữ trơn; nguyên liệu và các bước xếp liền nhau không tab; nút nằm trong trang | cao | `RecipeDetail.tsx` |
| Chế độ nấu | Chữ bước 26px canh giữa dọc; thẻ trắng chứa đồng hồ vòng cam; hàng "Nguyên liệu · 6 món" rộng; nút Bước tiếp 56 | Chữ bước canh trên; vòng xanh 112 có số trong vòng, nút "Bắt đầu hẹn giờ"; nút icon cho nguyên liệu | vừa | `cooking/components` |
| Thực đơn tuần | Dải 7 ngày, mỗi bữa một thẻ có nút "Thêm món" viền đứt; nút "Gợi ý thực đơn" rộng hết dòng | Tương tự; chọn ngày bằng ô vuông và viền cam | thấp | `plan/components` |
| Đi chợ | Thẻ "Cần bạn quyết định" (chip cạnh tiêu đề) rồi các nhóm; thanh dưới dính sát tab bar: "24 món cần mua" + nút "Ghi vào Chi tiêu" | Thẻ "Ảnh hưởng đến ngân sách" (chip dưới đoạn văn); thanh dưới nổi giữa nội dung | vừa | Xem lỗi thanh dính đáy |
| Trình soạn công thức | Trang con có nút "‹ Công thức" và tiêu đề "Công thức mới", banner link, vùng ảnh, ô tên, hai ô phút, khẩu phần, nhãn, thẻ nguyên liệu (SL, đơn vị, tên, khu mua, giá), thẻ các bước, thanh Huỷ/Lưu | Cùng nội dung xếp dọc nhưng không có "‹" quay lại, ô phút xếp từng hàng; thanh Huỷ/Lưu nổi giữa nội dung | vừa | `editor/components` |
| Hộp thoại Quản lý ví | Sheet có danh sách với nút bút/thùng rác tròn lớn, ghi chú, nút "Thêm ví" | Sheet nhỏ hơn, nút nhỏ, có nút đóng X | thấp | `wallets` |
| Màn lần đầu, không tìm thấy trang | Có | Không chụp được điện thoại | | |

## Chế độ tối

Token màu tối giống hệt (đã so `--surface`, `--surface-raised`, `--surface-tint`, `--text-*`, `--line-hairline`, `--accent`, `--income-fg`, `--expense-fg`, `--chart-*`; nền trang `rgb(21,17,10)`, nền thẻ `rgb(31,26,15)`, bóng thẻ như nhau). Ảnh chụp màn Tổng quan tối hai bên trùng về màu và độ tương phản. Các khác biệt cấu trúc ở phần trên giữ nguyên ở chế độ tối. Chỉ riêng một điểm khác về màu: mockup tô icon mục điều hướng (hai tông) và đồng hồ nấu bằng `--chart-1` còn app dùng xám và xanh lá (`mint`).

## Chưa vào được hoặc chưa đối chiếu

- Các trạng thái đồng bộ Google (Chưa kết nối có nút "Kết nối với Google", Đang kết nối, Đã kết nối, Đang đồng bộ, Mất mạng, Xung đột, Cần đăng nhập lại): bản dev chưa có khoá OAuth nên app luôn ở trạng thái "Chưa cấu hình đăng nhập Google". Trạng thái này đối chiếu được và nằm ở phần Cài đặt. Các trạng thái còn lại chỉ có trong code (`ConnectedCard.tsx`, `ConflictsCard.tsx`), tôi chưa dựng được để chụp.
- Màn xem trước Nhập sao kê, hộp thoại "Nhập dữ liệu từ tệp này?" (cần chọn tệp), trạng thái thông báo hết giờ và chip bước đang chạy của chế độ nấu (cần chạy đồng hồ nhiều giây), nút xuất bảng tính (tải file).
- Ba khung thông báo của hệ điều hành trong `mobile.html` (màn hình khoá, nút hành động, banner nổi): là thông báo của hệ điều hành, app trình duyệt không vẽ được.
- Màn "Màn hình này đang được hoàn thiện" cho ứng dụng Sắp có: app không có đường dẫn tương ứng nên không dựng được.
- Hover, nhấn, đang tải (skeleton), đang kéo thả, trạng thái lỗi: mockup không vẽ nên không có gì để so.
- Mức tối của khung điện thoại: không chụp riêng, dựa vào việc token giống hệt.
- Hộp thoại con trong mockup web ("Thêm ví", "Thêm khoản định kỳ", "Xoá công thức") chỉ so được bằng đọc code vì dữ liệu mẫu hai bên khác.
- Mọi chữ "sticker" (ô tròn nhuộm màu chứa hình Fluent Emoji so với ô icon nét) chỉ được ghi lại để agent sticker xử lý, không mô tả chi tiết.
