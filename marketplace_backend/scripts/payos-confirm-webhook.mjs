// Đặt URL webhook cho kênh PayOS có khóa trong .env.dev:
//   pnpm payos:confirm-webhook https://<tên>.ngrok-free.app/api/v1/payments/payos/webhook
//
// PayOS gửi thử một payload mẫu (orderCode 123) tới URL này và chỉ chấp nhận khi URL trả mã 2xx,
// nên backend phải đang chạy và URL phải truy cập được từ Internet (ví dụ qua ngrok).
// Mỗi kênh chỉ có một webhook URL: lệnh này thay URL cũ của kênh nếu đã có.
// Script không in khóa, số tài khoản hay tên chủ tài khoản ra màn hình.

const PAYOS_CONFIRM_WEBHOOK_URL = 'https://api-merchant.payos.vn/confirm-webhook';

function fail(message) {
  console.error(message);
  process.exit(1);
}

const webhookUrl = process.argv[2]?.trim();
if (!webhookUrl) {
  fail(
    'Thiếu URL. Ví dụ: pnpm payos:confirm-webhook https://<tên>.ngrok-free.app/api/v1/payments/payos/webhook',
  );
}

let parsed;
try {
  parsed = new URL(webhookUrl);
} catch {
  fail(`URL không hợp lệ: ${webhookUrl}`);
}
if (parsed.protocol !== 'https:') {
  fail('PayOS chỉ gửi webhook tới URL https');
}

const clientId = process.env.PAYOS_CLIENT_ID?.trim();
const apiKey = process.env.PAYOS_API_KEY?.trim();
if (!clientId || !apiKey) {
  fail('Thiếu PAYOS_CLIENT_ID hoặc PAYOS_API_KEY trong .env.dev');
}

let response;
try {
  response = await fetch(PAYOS_CONFIRM_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'x-client-id': clientId,
      'x-api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ webhookUrl }),
    signal: AbortSignal.timeout(30_000),
  });
} catch (error) {
  fail(`Không gọi được PayOS: ${error instanceof Error ? error.message : error}`);
}

const body = await response.json().catch(() => null);
if (!response.ok || body?.code !== '00') {
  fail(
    `PayOS không chấp nhận URL (HTTP ${response.status}, mã ${body?.code ?? 'không có'}): ${body?.desc ?? 'không rõ lý do'}`,
  );
}

console.log(`Đã đặt webhook cho kênh PayOS: ${body.data?.webhookUrl ?? webhookUrl}`);
