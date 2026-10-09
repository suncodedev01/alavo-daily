export interface FailureCopy {
  title: string;
  description: string;
  detail?: string;
}

export function describeFailure(message: string): FailureCopy {
  if (message.includes('already_open_in_another_tab')) {
    return {
      title: 'Alavo Daily đang mở ở một tab khác',
      description:
        'Dữ liệu chỉ mở được ở một tab tại một thời điểm để không bị ghi đè. Hãy đóng tab kia hoặc chuyển sang tab đó, rồi tải lại trang này.',
    };
  }
  if (message.includes('storage_unavailable')) {
    return {
      title: 'Trình duyệt không cho lưu dữ liệu',
      description:
        'Alavo Daily cần vùng lưu trữ riêng của trình duyệt để giữ dữ liệu trên máy bạn. Hãy thoát chế độ ẩn danh, cho phép trang này lưu dữ liệu, hoặc mở bằng Chrome, Edge hay Safari bản mới.',
    };
  }
  return {
    title: 'Không mở được dữ liệu',
    description: 'Đã có lỗi khi mở dữ liệu trên máy. Hãy tải lại trang, nếu vẫn lỗi thì thử khởi động lại ứng dụng.',
    detail: message,
  };
}
