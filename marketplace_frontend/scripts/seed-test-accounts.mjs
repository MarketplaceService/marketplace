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
  experienceYears: 5,
  bio: "Tài khoản mẫu để thử lịch làm việc, bản đồ, đặt lịch và nhắn tin trực tiếp.",
  area: {
    name: "Quận 9, TP. Hồ Chí Minh",
    latitude: 10.8456,
    longitude: 106.7719,
    radiusKm: 15,
  },
  service: {
    categorySlug: "sua-dien-lanh",
    categoryName: "Sửa điện lạnh",
    title: "Vệ sinh & Bảo dưỡng điều hòa Inverter tại nhà",
    description:
      "Vệ sinh dàn lạnh, dàn nóng bằng máy xịt áp lực chuyên dụng, kiểm tra đường ống thoát nước và đo gas miễn phí.",
    basePrice: 180000,
    priceUnit: "FIXED",
    durationMinutes: 60,
  },
};

const SAMPLE_CUSTOMER_ADDRESS = {
  fullName: "Khách hàng Mẫu",
  phone: "0900000003",
  addressLine1: "123 Lê Văn Việt",
  ward: "Hiệp Phú",
  district: "Quận 9",
  city: "TP. Hồ Chí Minh",
  latitude: 10.8456,
  longitude: 106.7719,
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
  const { displayName, experienceYears, bio, area } = SAMPLE_PROVIDER_PROFILE;

  const { rows } = await client.query(
    `INSERT INTO provider_profile
       (id, user_id, display_name, phone, experience_years, bio, verification_status, approved_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'APPROVED', now())
     ON CONFLICT (user_id) DO UPDATE
     SET display_name = EXCLUDED.display_name,
         phone = EXCLUDED.phone,
         experience_years = EXCLUDED.experience_years,
         bio = EXCLUDED.bio,
         verification_status = 'APPROVED',
         approved_at = COALESCE(provider_profile.approved_at, now()),
         rejection_reason = NULL,
         updated_at = now()
     RETURNING id`,
    [uuidv7(), userId, displayName, phone, experienceYears, bio],
  );
  const providerId = rows[0].id;

  await client.query(`DELETE FROM provider_service_area WHERE provider_id = $1`, [providerId]);
  await client.query(
    `INSERT INTO provider_service_area
       (id, provider_id, area_name, center_latitude, center_longitude, radius_km, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)`,
    [uuidv7(), providerId, area.name, area.latitude, area.longitude, area.radiusKm],
  );

  // Đảm bảo có ít nhất 1 danh mục và 1 dịch vụ ACTIVE để thợ xuất hiện trên bản đồ & đặt lịch được
  const { service } = SAMPLE_PROVIDER_PROFILE;
  const catRes = await client.query(
    `INSERT INTO service_category (id, name, slug, is_active)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (slug) DO UPDATE SET is_active = true
     RETURNING id`,
    [uuidv7(), service.categoryName, service.categorySlug],
  );
  const categoryId = catRes.rows[0].id;

  const existingSvc = await client.query(
    `SELECT id FROM service WHERE provider_id = $1 AND status = 'ACTIVE' LIMIT 1`,
    [providerId],
  );
  if (existingSvc.rows.length === 0) {
    await client.query(
      `INSERT INTO service
         (id, provider_id, category_id, title, description, base_price, price_unit, duration_minutes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')`,
      [
        uuidv7(),
        providerId,
        categoryId,
        service.title,
        service.description,
        service.basePrice,
        service.priceUnit,
        service.durationMinutes,
      ],
    );
  }

  // Bổ sung lịch làm việc 08:00-18:00 cả tuần nếu thợ chưa có lịch nào
  const existingAvail = await client.query(
    `SELECT 1 FROM provider_availability WHERE provider_id = $1 LIMIT 1`,
    [providerId],
  );
  if (existingAvail.rows.length === 0) {
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
      await client.query(
        `INSERT INTO provider_availability (id, provider_id, day_of_week, start_time, end_time, is_active)
         VALUES ($1, $2, $3, '08:00:00', '18:00:00', true)`,
        [uuidv7(), providerId, dayOfWeek],
      );
    }
  }

  return providerId;
}

async function seedCustomerAddress(userId) {
  const existing = await client.query(
    `SELECT 1 FROM address WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [userId],
  );
  if (existing.rows.length > 0) return;

  const a = SAMPLE_CUSTOMER_ADDRESS;
  await client.query(
    `INSERT INTO address
       (id, user_id, full_name, phone, address_line1, ward, district, city, latitude, longitude, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)`,
    [
      uuidv7(),
      userId,
      a.fullName,
      a.phone,
      a.addressLine1,
      a.ward,
      a.district,
      a.city,
      a.latitude,
      a.longitude,
    ],
  );
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
    } else if (role === "customer") {
      await seedCustomerAddress(userId);
      console.log(`Đã sẵn sàng: ${email} (${role}) (đã có địa chỉ mặc định Quận 9)`);
    } else {
      console.log(`Đã sẵn sàng: ${email} (${role})`);
    }
  }
} finally {
  await client.end();
}
