import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

const messages: Record<string, string> = {
  'errors.common.userNotFound': 'Không tìm thấy người dùng',
  'errors.auth.verificationFailed': 'Token xác minh không hợp lệ',
  'errors.auth.tokenExpired': 'Token xác minh đã hết hạn',
  'errors.auth.emailMismatch': 'Email không khớp với token xác minh',
  'errors.address.notFound': 'Không tìm thấy địa chỉ',
  'errors.address.defaultConflict':
    'Địa chỉ mặc định vừa được thay đổi, vui lòng thử lại',
  'errors.user.invalidAvatar': 'Ảnh đại diện phải là file JPG hoặc PNG',
  'errors.user.activeBookingConflict':
    'Không thể xóa tài khoản khi vẫn còn đơn đặt lịch đã xác nhận hoặc đang thực hiện',
  'errors.storage.uploadFailed': 'Không thể tải ảnh lên, vui lòng thử lại sau',
  'errors.storage.signFailed': 'Không thể tải ảnh, vui lòng thử lại sau',
  'errors.provider.profileNotFound':
    'Không tìm thấy hồ sơ nhà cung cấp của bạn',
  'errors.provider.notFound': 'Không tìm thấy nhà cung cấp',
  'errors.provider.invalidDocument':
    'Tài liệu phải là file JPG, PNG, WebP hoặc PDF và tối đa 2MB',
  'errors.provider.serviceTitleRequired': 'Vui lòng nhập tên cho mọi dịch vụ',
  'errors.provider.duplicateServiceTitle': 'Hai dịch vụ không được trùng tên',
  'errors.provider.invalidDocumentUrl':
    'Đường dẫn tài liệu không hợp lệ hoặc chưa được tải lên hệ thống',
  'errors.schedule.invalidTimeRange': 'Giờ kết thúc phải sau giờ bắt đầu',
  'errors.schedule.overlap':
    'Các ca làm việc trong cùng một ngày không được chồng lên nhau',
  'errors.schedule.notFound': 'Không tìm thấy ca làm việc',
  'errors.timeOff.invalidRange':
    'Thời điểm kết thúc nghỉ phải sau thời điểm bắt đầu',
  'errors.timeOff.ended': 'Khoảng nghỉ này đã kết thúc',
  'errors.timeOff.notFound': 'Không tìm thấy khoảng nghỉ',
  'errors.timeOff.bookingConflict':
    'Khoảng nghỉ trùng với đơn đặt lịch đang chờ hoặc đã xác nhận, vui lòng xử lý đơn trước',
  'errors.slots.invalidDate': 'Ngày không hợp lệ',
  'errors.slots.pastDate': 'Không thể xem lịch của ngày đã qua',
  'errors.slots.outOfRange': 'Chỉ xem được lịch trong 30 ngày tới',
  'errors.geocoding.notConfigured': 'Chưa cấu hình dịch vụ tìm địa chỉ',
  'errors.geocoding.upstreamFailed':
    'Dịch vụ tìm địa chỉ đang gặp lỗi, vui lòng thử lại sau',
  'errors.booking.notFound': 'Không tìm thấy đơn đặt lịch',
  'errors.booking.forbidden':
    'Bạn không có quyền thực hiện thao tác này trên đơn đặt lịch',
  'errors.booking.serviceInactive':
    'Dịch vụ hiện không khả dụng hoặc chưa được kích hoạt',
  'errors.booking.providerOffline':
    'Thợ hiện đang tạm nghỉ nhận việc, vui lòng chọn thợ khác hoặc thử lại sau',
  'errors.booking.selfBooking':
    'Bạn không thể tự đặt lịch cho dịch vụ của chính mình',
  'errors.booking.outOfServiceArea':
    'Địa chỉ bạn chọn nằm ngoài phạm vi phục vụ của thợ',
  'errors.booking.slotUnavailable':
    'Khung giờ đã chọn không còn trống hoặc nằm ngoài lịch làm việc của thợ',
  'errors.booking.slotConflict':
    'Khung giờ này vừa được đặt, vui lòng chọn khung giờ khác',
  'errors.booking.invalidTransition':
    'Không thể chuyển trạng thái đơn đặt lịch ở bước hiện tại',
  'errors.booking.missingInspectionImages':
    'Thợ chưa tải đủ ảnh nghiệm thu Trước và Sau khi sửa nên chưa thể hoàn tất đơn',
  'errors.booking.cannotCancelInProgress':
    'Không thể hủy đơn khi thợ đang thực hiện công việc',
  'errors.booking.invalidImage':
    'Ảnh tải lên phải là định dạng JPG, PNG hoặc WebP và tối đa 5MB',
  'errors.booking.invalidImageUrl':
    'Đường dẫn ảnh không hợp lệ hoặc chưa được tải lên hệ thống',
  'errors.booking.tooManyInitialImages':
    'Chỉ được tải tối đa 3 ảnh hiện trạng ban đầu',
  'errors.booking.reasonRequired': 'Vui lòng nhập lý do thực hiện thao tác này',
  'errors.booking.addressNotFound':
    'Không tìm thấy địa chỉ hoặc địa chỉ không thuộc tài khoản của bạn',
  'errors.booking.invalidScheduleTime':
    'Thời gian hẹn đặt lịch không hợp lệ hoặc đã qua',
};

export function translateApiMessage(key: string) {
  return messages[key] ?? key;
}

export function apiBadRequest(key: string): never {
  throw new BadRequestException(translateApiMessage(key));
}

export function apiForbidden(key: string): never {
  throw new ForbiddenException(translateApiMessage(key));
}

export function apiNotFound(key: string): never {
  throw new NotFoundException(translateApiMessage(key));
}

export function apiBadGateway(key: string): never {
  throw new BadGatewayException(translateApiMessage(key));
}

export function apiConflict(key: string, detail?: string): never {
  const message = translateApiMessage(key);
  throw new ConflictException(detail ? `${message} (${detail})` : message);
}

export function apiServiceUnavailable(key: string): never {
  throw new ServiceUnavailableException(translateApiMessage(key));
}
