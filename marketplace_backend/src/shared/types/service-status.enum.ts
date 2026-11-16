export enum ServiceStatus {
  DRAFT = 'DRAFT', // Bản nháp thợ đang soạn
  PENDING = 'PENDING', // Đang chờ xét duyệt
  ACTIVE = 'ACTIVE', // Đang hoạt động, hiển thị công khai
  REJECTED = 'REJECTED', // Bị từ chối
  INACTIVE = 'INACTIVE', // Tạm ngừng cung cấp
}
