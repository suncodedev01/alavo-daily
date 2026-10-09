# 0014 · Màn hình ghép vào khung ứng dụng bằng portal

Trạng thái: Đã chọn · Ngày: 2026-10-09

Hub sở hữu khung ứng dụng (thanh bên, tiêu đề, bảng danh sách, bảng ngữ cảnh), còn mỗi module sở hữu nội dung từng màn. Hai bên gặp nhau ở một component duy nhất, `Screen`, nằm trong `packages/client/common` để module không phải import hub. Màn hình viết `<Screen title list dock actions>...</Screen>`: phần `children` là ngăn làm việc, còn `list`, `dock` và `actions` được vẽ vào các ngăn của khung bằng **portal** của React.

Dùng portal thay vì để màn hình trả dữ liệu lên khung bằng state, vì truyền một cây React lên state của cha sẽ tạo vòng lặp vẽ lại (mỗi lần vẽ sinh ra một cây mới). Với portal, nội dung các ngăn vẫn thuộc cây React của màn hình, nên giữ nguyên state, context và các hook của màn đó, và khung chỉ cần biết hai điều nhỏ qua `describeScreen`: màn có danh sách không, có bảng ngữ cảnh không.

Trên khung hẹp, màn chọn `narrowShows` là `list` hay `main` để xác định người dùng thấy gì trước (ví dụ danh sách công thức trước, chi tiết sau khi bấm vào một món). Bảng ngữ cảnh không hiện trên khung hẹp, nên thông tin quan trọng trong đó phải có cách khác để tới được.

Đánh đổi: màn hình phụ thuộc vào việc khung cung cấp đúng các điểm gắn, và test màn hình cần một khung giả. Đã có `ShellSlotsContext` và test cho phần này.
