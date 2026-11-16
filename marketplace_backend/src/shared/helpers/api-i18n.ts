import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
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
  'errors.storage.uploadFailed': 'Không thể tải ảnh lên, vui lòng thử lại sau',
  'errors.provider.profileNotFound':
    'Không tìm thấy hồ sơ nhà cung cấp của bạn',
  'errors.provider.notFound': 'Không tìm thấy nhà cung cấp',
  'errors.schedule.invalidTimeRange': 'Giờ kết thúc phải sau giờ bắt đầu',
  'errors.schedule.overlap':
    'Các ca làm việc trong cùng một ngày không được chồng lên nhau',
  'errors.schedule.notFound': 'Không tìm thấy ca làm việc',
  'errors.timeOff.invalidRange':
    'Thời điểm kết thúc nghỉ phải sau thời điểm bắt đầu',
  'errors.timeOff.ended': 'Khoảng nghỉ này đã kết thúc',
  'errors.timeOff.notFound': 'Không tìm thấy khoảng nghỉ',
  'errors.timeOff.bookingConflict':
    'Khoảng nghỉ trùng với đơn đặt lịch đã xác nhận, vui lòng xử lý đơn trước',
  'errors.slots.invalidDate': 'Ngày không hợp lệ',
  'errors.slots.pastDate': 'Không thể xem lịch của ngày đã qua',
  'errors.slots.outOfRange': 'Chỉ xem được lịch trong 30 ngày tới',
  'errors.geocoding.notConfigured': 'Chưa cấu hình dịch vụ tìm địa chỉ',
  'errors.geocoding.upstreamFailed':
    'Dịch vụ tìm địa chỉ đang gặp lỗi, vui lòng thử lại sau',
};

export function translateApiMessage(key: string) {
  return messages[key] ?? key;
}

export function apiBadRequest(key: string): never {
  throw new BadRequestException(translateApiMessage(key));
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
