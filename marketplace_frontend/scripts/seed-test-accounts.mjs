// Tạo hoặc đặt lại tài khoản mẫu trên database local: pnpm seed:test-accounts
// Tài khoản provider có kèm hồ sơ thợ đã duyệt và một vùng phục vụ.
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
  {
    name: "Khách hàng Mẫu",
    email: "customer@trustfix.test",
    role: "customer",
    phone: "0900000003",
  },
];

// Hồ sơ thợ đã duyệt cho tài khoản provider, để trang lịch làm việc và hồ sơ công khai có dữ liệu.
// Chạy lại seed sẽ đặt lại hồ sơ và vùng phục vụ, nhưng giữ nguyên lịch tuần và khoảng nghỉ.
const SAMPLE_PROVIDER_PROFILE = {
  displayName: "Nhà cung cấp Mẫu",
  category: "1. Điện lạnh (Điều hòa, máy giặt, tủ lạnh)",
  experienceYears: 5,
  bio: "Tài khoản mẫu để thử lịch làm việc và hồ sơ công khai của thợ.",
  area: { name: "Cầu Giấy, Hà Nội", latitude: 21.0368, longitude: 105.7826, radiusKm: 10 },
};

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

async function seedProviderProfile(userId, phone) {
  const { displayName, category, experienceYears, bio, area } = SAMPLE_PROVIDER_PROFILE;

  const { rows } = await client.query(
    `INSERT INTO provider_profile
       (id, user_id, display_name, phone, experience_years, category_id, bio, verification_status, approved_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'APPROVED', now())
     ON CONFLICT (user_id) DO UPDATE
     SET display_name = EXCLUDED.display_name,
         phone = EXCLUDED.phone,
         experience_years = EXCLUDED.experience_years,
         category_id = EXCLUDED.category_id,
         bio = EXCLUDED.bio,
         verification_status = 'APPROVED',
         approved_at = COALESCE(provider_profile.approved_at, now()),
         rejection_reason = NULL,
         updated_at = now()
     RETURNING id`,
    [uuidv7(), userId, displayName, phone, experienceYears, category, bio],
  );
  const providerId = rows[0].id;

  await client.query(`DELETE FROM provider_service_area WHERE provider_id = $1`, [providerId]);
  await client.query(
    `INSERT INTO provider_service_area
       (id, provider_id, area_name, center_latitude, center_longitude, radius_km, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)`,
    [uuidv7(), providerId, area.name, area.latitude, area.longitude, area.radiusKm],
  );

  return providerId;
}

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

    if (role === "provider") {
      const providerId = await seedProviderProfile(userId, phone);
      console.log(`Đã sẵn sàng: ${email} (${role}), hồ sơ công khai /providers/${providerId}`);
    } else {
      console.log(`Đã sẵn sàng: ${email} (${role})`);
    }
  }
} finally {
  await client.end();
}
