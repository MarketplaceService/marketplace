# Cài PayOS và ngrok để chạy thanh toán ở máy local

Servigo thanh toán đơn đặt lịch bằng tiền mặt (`cod`) hoặc chuyển khoản VietQR qua PayOS (`payos`). Tài liệu này hướng dẫn lấy khóa PayOS, khai báo biến môi trường và nhận webhook ở máy local qua ngrok.

PayOS **không có môi trường test**. Mọi link đều là link thật, nên khi thử hãy trả một khoản nhỏ vào tài khoản của chính mình.

## 1. Đăng ký PayOS và lấy khóa

1. Vào https://my.payos.vn, chọn **Đăng ký**, điền form, rồi bấm **Xác thực** trong email PayOS gửi.
2. Xác thực tổ chức, chọn loại **Tài khoản cá nhân/Hộ kinh doanh** (cần số CCCD và họ tên).
   - PayOS xác thực tự động khi bạn chuyển khoản theo mã QR họ đưa, đúng số tiền và đúng nội dung.
   - Phải chuyển từ tài khoản ngân hàng đứng tên bạn, không dùng ví điện tử.
   - Nếu không được xác thực tự động, gửi ảnh hai mặt CCCD tới verify@payos.vn, tiêu đề `[payOS] Xác thực thủ công + email dùng payOS`.
3. Liên kết một tài khoản ngân hàng đứng cùng tên với tổ chức vừa xác thực.
4. Tạo một **kênh thanh toán** gắn với tài khoản đó, rồi mở kênh để lấy **Client ID**, **API Key** và **Checksum Key**.
5. Nếu tạo link bị báo chưa có gói dịch vụ, vào mục gói dịch vụ trên my.payos.vn để kiểm tra.

Mỗi kênh chỉ đăng ký được **một** webhook URL. Nếu cả nhóm dùng chung một kênh thì webhook chỉ về máy một người, nên mỗi người nên có kênh riêng.

## 2. Biến môi trường (`marketplace_backend/.env.dev`)

```
PAYOS_CLIENT_ID=<Client ID>
PAYOS_API_KEY=<API Key>
PAYOS_CHECKSUM_KEY=<Checksum Key>
PAYOS_RETURN_URL=http://localhost:3000/payments/result
PAYOS_CANCEL_URL=http://localhost:3000/payments/result
# Tùy chọn: hạn của link thanh toán tính bằng phút, từ 5 đến 60, mặc định 15
# PAYOS_LINK_TTL_MINUTES=15
```

- **Ba khóa:** thiếu một khóa thì PayOS tắt, trang checkout chỉ còn tiền mặt. Không commit file `.env.dev`.
- **Đường dẫn trả về:**
  - `PAYOS_RETURN_URL` và `PAYOS_CANCEL_URL` là đường dẫn gốc của trang kết quả **trên frontend**, không phải backend.
  - Mỗi giao dịch, backend nối thêm `/<paymentId>`. PayOS gắn tiếp `?code=…&id=…&cancel=…&status=…&orderCode=…`.
  - Không có dấu `/` ở cuối, không thêm query.
  - Để trống thì dùng `<CLIENT_URL>/payments/result`.
- **Dùng `localhost` là đủ:** PayOS chuyển chính trình duyệt đang mở trang PayOS về địa chỉ này. Mở app qua IP LAN hoặc khi deploy thì đổi thành địa chỉ tương ứng.

## 3. ngrok cho webhook

Khi tiền về, PayOS gọi webhook. Ở máy local, PayOS không gọi được `localhost`, nên cần ngrok mở một địa chỉ công khai trỏ về backend.

Không có ngrok vẫn test được, chỉ chậm hơn:
- Trang kết quả tự hỏi PayOS (endpoint sync) mỗi 6 giây trong 2 phút.
- Trang đơn có nút "Tôi đã chuyển khoản, kiểm tra lại".

1. Tạo tài khoản ngrok, rồi tải agent cho Windows ở https://ngrok.com/download.
2. Lấy token ở https://dashboard.ngrok.com/get-started/your-authtoken, rồi chạy:
   ```
   ngrok config add-authtoken <token>
   ```
3. Chạy backend (`pnpm start:dev`, cổng 8080), rồi chạy:
   ```
   ngrok http 8080
   ```
   - Gói free tự cấp một dev domain cố định, dạng `https://<tên>.ngrok-free.dev` (hoặc `.ngrok-free.app`). Domain này không đổi khi chạy lại.
   - Gói free không đặt được domain riêng bằng `--url`.
   - Trong Claude Code, mục `ngrok` của `.claude/launch.json` chạy đúng lệnh này.
4. Đăng ký webhook cho kênh PayOS. Backend phải đang chạy, vì PayOS sẽ gửi thử một payload mẫu (`orderCode` 123) và chỉ chấp nhận khi URL trả mã 2xx:
   ```
   pnpm payos:confirm-webhook https://<tên>.ngrok-free.dev/api/v1/payments/payos/webhook
   ```
   Cách khác là nhập URL đó trong my.payos.vn. Lệnh này thay webhook cũ của kênh nếu đã có.
5. Xem các request PayOS gửi tới ở http://127.0.0.1:4040.

Lưu ý:
- Trang cảnh báo của ngrok free chỉ hiện với request GET từ trình duyệt, nên webhook POST của PayOS không bị ảnh hưởng.
- Gói free cho 20.000 request mỗi tháng, đủ dùng khi dev.

## 4. Luồng thanh toán

- **Tiền mặt:** đặt đơn thì tạo giao dịch `pending`. Khách nghiệm thu thì giao dịch thành `completed`.
- **PayOS:**
  1. Đặt đơn thì tạo giao dịch `pending`.
  2. Sau khi lưu đơn xong, backend tạo link PayOS hạn 15 phút, rồi frontend chuyển khách sang trang PayOS.
  3. Tiền về: webhook (hoặc lệnh sync) chuyển giao dịch thành `completed`.
  4. Khách quay về `/payments/result/<paymentId>`.
- **Chưa trả** (bấm hủy hoặc link hết hạn): đơn vẫn giữ. Khách tạo link mới hoặc đổi sang tiền mặt, và phải trả xong mới nghiệm thu được (API trả 409).
- **Hủy hoặc từ chối đơn:**
  - Giao dịch đang chờ thành `cancelled`, link PayOS bị hủy.
  - Giao dịch đã trả thành `refunded`. PayOS không có API hoàn tiền, nên việc chuyển tiền lại cho khách làm thủ công.

Endpoint (tiền tố `/api/v1`):

| Endpoint | Việc |
|---|---|
| `POST /payments/payos/webhook` | Webhook PayOS, công khai, xác thực bằng chữ ký |
| `GET /payments/methods` | Phương thức đang bật |
| `GET /payments/:id` | Trạng thái đọc từ DB, dùng để polling |
| `POST /payments/:id/sync` | Hỏi PayOS trạng thái thật |
| `GET /bookings/:id/payments` | Lịch sử giao dịch của đơn |
| `POST /bookings/:id/payments` | Thanh toán lại hoặc đổi phương thức |

## 5. Gỡ lỗi nhanh

| Hiện tượng | Nguyên nhân thường gặp |
|---|---|
| Checkout làm mờ PayOS, ghi "Chưa cấu hình cổng PayOS" | Thiếu một trong ba khóa, hoặc chưa khởi động lại backend sau khi sửa `.env.dev` |
| Webhook trả 400 "Chữ ký webhook không hợp lệ" | `PAYOS_CHECKSUM_KEY` không khớp với kênh đang gửi webhook |
| `payos:confirm-webhook` báo PayOS không chấp nhận URL | Backend hoặc ngrok chưa chạy, hoặc URL thiếu `/api/v1/payments/payos/webhook` |
| Đã chuyển khoản mà trang không đổi | Webhook chưa về máy bạn. Bấm "Tôi đã chuyển khoản, kiểm tra lại", hoặc kiểm tra ngrok và webhook URL của kênh |
