// Chuyển ảnh booking và giấy tờ KYC cũ từ bucket công khai sang bucket riêng tư: pnpm storage:move-private [--dry-run]
//
// Trước đây mọi file nằm trong bucket công khai SUPABASE_BUCKET_NAME (avatars), database lưu URL công khai.
// Giờ bookings/ và providers/ nằm trong bucket riêng tư SUPABASE_PRIVATE_BUCKET_NAME và database chỉ lưu path.
// Script này, trên database local:
//   1. Tạo bucket riêng tư nếu chưa có.
//   2. Tìm các URL công khai cũ trong provider_document.file_url và booking.inspection_images.
//   3. Copy file sang bucket riêng tư, giữ nguyên path. File đã có ở bucket đích thì bỏ qua.
//   4. Đổi các URL đó thành path, trong một transaction.
// File trong bucket công khai được giữ lại, vì database của đồng đội có thể vẫn trỏ tới chúng.
// Chạy lại nhiều lần vẫn an toàn.
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

const LOCAL_DB_HOSTS = ['localhost', '127.0.0.1'];
const PRIVATE_FOLDERS = ['bookings/', 'providers/'];
const INSPECTION_GROUPS = ['initial', 'before', 'after'];
// Khớp giới hạn upload ở backend: ảnh booking tối đa 5MB, giấy tờ KYC có thể là PDF
const PRIVATE_BUCKET_OPTIONS = {
  public: false,
  fileSizeLimit: 5 * 1024 * 1024,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ],
};

const DRY_RUN = process.argv.includes('--dry-run');
const {
  DB_HOST,
  DB_PORT,
  DB_USERNAME,
  DB_PASSWORD,
  DB_NAME,
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  SUPABASE_BUCKET_NAME,
} = process.env;
const PRIVATE_BUCKET =
  process.env.SUPABASE_PRIVATE_BUCKET_NAME?.trim() || 'private-files';

if (!LOCAL_DB_HOSTS.includes(DB_HOST)) {
  throw new Error(
    `Chỉ được chạy trên database local, DB_HOST đang là "${DB_HOST}"`,
  );
}
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !SUPABASE_BUCKET_NAME) {
  throw new Error(
    'Thiếu SUPABASE_URL, SUPABASE_SECRET_KEY hoặc SUPABASE_BUCKET_NAME trong .env.dev',
  );
}
if (PRIVATE_BUCKET === SUPABASE_BUCKET_NAME) {
  throw new Error(
    'SUPABASE_PRIVATE_BUCKET_NAME phải khác SUPABASE_BUCKET_NAME',
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicFiles = supabase.storage.from(SUPABASE_BUCKET_NAME);
const publicPrefix = publicFiles.getPublicUrl('').data.publicUrl;

/** Trả path nếu value là URL công khai cũ của bookings/ hoặc providers/, ngược lại null */
function toLegacyPath(value) {
  if (typeof value !== 'string' || !value.startsWith(publicPrefix)) return null;
  let path;
  try {
    path = decodeURI(value.slice(publicPrefix.length).split('?')[0]);
  } catch {
    return null;
  }
  if (
    path.includes('..') ||
    !PRIVATE_FOLDERS.some((folder) => path.startsWith(folder))
  ) {
    return null;
  }
  return path;
}

const isAlreadyExists = (error) =>
  error?.status === 409 ||
  error?.statusCode === '409' ||
  /already exists/i.test(error?.message ?? '');

async function ensurePrivateBucket() {
  const { data: existing } = await supabase.storage.getBucket(PRIVATE_BUCKET);

  if (existing) {
    if (existing.public) {
      throw new Error(
        `Bucket "${PRIVATE_BUCKET}" đang công khai, hãy tắt Public trước khi chạy lại`,
      );
    }
    console.log(`Bucket "${PRIVATE_BUCKET}" đã có và đang riêng tư`);
    return;
  }

  if (DRY_RUN) {
    console.log(`[dry-run] Sẽ tạo bucket riêng tư "${PRIVATE_BUCKET}"`);
    return;
  }

  const { error } = await supabase.storage.createBucket(
    PRIVATE_BUCKET,
    PRIVATE_BUCKET_OPTIONS,
  );
  if (error && !isAlreadyExists(error)) {
    throw new Error(
      `Không tạo được bucket "${PRIVATE_BUCKET}": ${error.message}`,
    );
  }
  console.log(`Đã tạo bucket riêng tư "${PRIVATE_BUCKET}"`);
}

const db = new Client({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,
});

await db.connect();

try {
  await ensurePrivateBucket();

  // 1. Tìm các URL công khai cũ
  const { rows: documents } = await db.query(
    `SELECT id, file_url FROM provider_document WHERE file_url LIKE $1 || '%'`,
    [publicPrefix],
  );
  const documentUpdates = documents
    .map((doc) => ({ id: doc.id, path: toLegacyPath(doc.file_url) }))
    .filter((doc) => doc.path);

  const { rows: bookings } = await db.query(
    `SELECT id, inspection_images FROM booking WHERE inspection_images IS NOT NULL`,
  );
  const bookingUpdates = [];
  for (const booking of bookings) {
    const paths = [];
    for (const group of INSPECTION_GROUPS) {
      for (const photo of booking.inspection_images[group] ?? []) {
        const path = toLegacyPath(photo?.url);
        if (path) paths.push(path);
      }
    }
    if (paths.length > 0) bookingUpdates.push({ ...booking, paths });
  }

  const allPaths = [
    ...new Set([
      ...documentUpdates.map((doc) => doc.path),
      ...bookingUpdates.flatMap((b) => b.paths),
    ]),
  ];
  console.log(
    `Tìm thấy ${allPaths.length} file cần chuyển: ${documentUpdates.length} giấy tờ KYC, ` +
      `${bookingUpdates.length} đơn có ảnh`,
  );

  if (DRY_RUN) {
    for (const path of allPaths) console.log(`[dry-run] ${path}`);
    console.log('[dry-run] Không copy file và không sửa database');
  } else {
    // 2. Copy sang bucket riêng tư. Chỉ đổi URL của những file đã nằm ở bucket đích
    const moved = new Set();
    let copied = 0;
    let skipped = 0;
    const failed = [];

    for (const path of allPaths) {
      const { error } = await publicFiles.copy(path, path, {
        destinationBucket: PRIVATE_BUCKET,
      });
      if (!error) {
        copied += 1;
        moved.add(path);
      } else if (isAlreadyExists(error)) {
        skipped += 1;
        moved.add(path);
      } else {
        failed.push(`${path}: ${error.message}`);
      }
    }

    // 3. Đổi URL thành path trong một transaction
    let documentRows = 0;
    let bookingRows = 0;
    await db.query('BEGIN');
    try {
      for (const doc of documentUpdates) {
        if (!moved.has(doc.path)) continue;
        await db.query(
          `UPDATE provider_document SET file_url = $1 WHERE id = $2`,
          [doc.path, doc.id],
        );
        documentRows += 1;
      }

      for (const booking of bookingUpdates) {
        const images = { ...booking.inspection_images };
        let changed = false;
        for (const group of INSPECTION_GROUPS) {
          if (!Array.isArray(images[group])) continue;
          images[group] = images[group].map((photo) => {
            const path = toLegacyPath(photo?.url);
            if (!path || !moved.has(path)) return photo;
            changed = true;
            return { ...photo, url: path };
          });
        }
        if (!changed) continue;
        await db.query(
          `UPDATE booking SET inspection_images = $1::jsonb WHERE id = $2`,
          [JSON.stringify(images), booking.id],
        );
        bookingRows += 1;
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    console.log(
      `Đã copy ${copied} file, bỏ qua ${skipped} file đã có ở "${PRIVATE_BUCKET}"`,
    );
    console.log(
      `Đã sửa ${documentRows} dòng provider_document và ${bookingRows} dòng booking`,
    );
    if (failed.length > 0) {
      console.log(
        `Không copy được ${failed.length} file, giữ nguyên URL cũ của chúng:`,
      );
      for (const line of failed) console.log(`  ${line}`);
      process.exitCode = 1;
    }
  }
} finally {
  await db.end();
}
