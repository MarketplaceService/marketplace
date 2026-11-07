// Tạo hoặc đặt lại tài khoản mẫu trên database local: pnpm seed:test-accounts
// Mật khẩu lấy từ TEST_ACCOUNT_PASSWORD trong .env.dev để không nằm trong git.
import { hashPassword } from "better-auth/crypto";
import { Client } from "pg";
import { v7 as uuidv7 } from "uuid";

const LOCAL_DB_HOSTS = ["localhost", "127.0.0.1"];

const TEST_ACCOUNTS = [
  {
    name: "Admin Mẫu",
    email: "admin@trustfix.test",
    role: "admin",
    phone: "0900000001",
  },
  {
    name: "Nhà cung cấp Mẫu",
    email: "provider@trustfix.test",
    role: "provider",
    phone: "0900000002",
  },
];

const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME, TEST_ACCOUNT_PASSWORD } =
  process.env;

if (!LOCAL_DB_HOSTS.includes(DB_HOST)) {
  throw new Error(`Chỉ được seed vào database local, DB_HOST đang là "${DB_HOST}"`);
}

if (!TEST_ACCOUNT_PASSWORD) {
  throw new Error("Thiếu TEST_ACCOUNT_PASSWORD trong .env.dev");
}

const client = new Client({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,
});

await client.connect();

try {
  const password = await hashPassword(TEST_ACCOUNT_PASSWORD);

  for (const { name, email, role, phone } of TEST_ACCOUNTS) {
    const { rows } = await client.query(
      `INSERT INTO "user" (id, name, email, email_verified, role, phone)
       VALUES ($1, $2, $3, true, $4, $5)
       ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name,
           email_verified = true,
           role = EXCLUDED.role,
           phone = EXCLUDED.phone,
           deleted_at = NULL,
           updated_at = now()
       RETURNING id`,
      [uuidv7(), name, email, role, phone],
    );
    const userId = rows[0].id;

    await client.query(
      `INSERT INTO account (id, user_id, account_id, provider_id, password)
       VALUES ($1, $2, $3, 'credential', $4)
       ON CONFLICT (provider_id, account_id) DO UPDATE
       SET password = EXCLUDED.password,
           updated_at = now()`,
      [uuidv7(), userId, userId, password],
    );

    console.log(`Đã sẵn sàng: ${email} (${role})`);
  }
} finally {
  await client.end();
}
