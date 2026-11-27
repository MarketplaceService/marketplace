// Khớp kiểu payment_method_enum trong Postgres. Hiện chỉ cod và payos chạy thật, các giá trị còn lại chừa sẵn
export enum PaymentMethod {
  COD = 'cod',
  BANK_TRANSFER = 'bank_transfer',
  PAYOS = 'payos',
  VNPAY = 'vnpay',
  MOMO = 'momo',
  ZALOPAY = 'zalopay',
}
