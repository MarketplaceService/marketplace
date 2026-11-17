import dataSource from '../config/database/data-source';
import { User } from '../app/user/entities/user.entity';
import { ProviderProfile } from '../app/provider/entities/provider-profile.entity';
import { ProviderServiceArea } from '../app/provider/entities/provider-service-area.entity';
import { ProviderAvailability } from '../app/scheduling/entities/provider-availability.entity';
import { ServiceCategory } from '../app/service/entities/service-category.entity';
import { Service } from '../app/service/entities/service.entity';
import { UserRole } from '../shared/types/user-role.enum';
import { VerificationStatus } from '../shared/types/verification-status.enum';
import { PriceUnit } from '../shared/types/price-unit.enum';
import { ServiceStatus } from '../shared/types/service-status.enum';

const CATEGORIES_DATA = [
  {
    name: 'Sửa điện lạnh',
    slug: 'sua-dien-lanh',
    icon: 'ac_unit',
    isActive: true,
  },
  {
    name: 'Sửa điện nước',
    slug: 'sua-dien-nuoc',
    icon: 'plumbing',
    isActive: true,
  },
  {
    name: 'Sửa khóa & Cửa cuốn',
    slug: 'sua-khoa-cua-cuon',
    icon: 'lock',
    isActive: true,
  },
  {
    name: 'Thông tắc vệ sinh',
    slug: 'thong-tac-ve-sinh',
    icon: 'wash',
    isActive: true,
  },
  {
    name: 'Vệ sinh nhà cửa',
    slug: 've-sinh-nha-cua',
    icon: 'cleaning_services',
    isActive: true,
  },
  {
    name: 'Thiết bị gia dụng',
    slug: 'thiet-bi-gia-dung',
    icon: 'microwave',
    isActive: true,
  },
  {
    name: 'Sơn sửa & Chống thấm',
    slug: 'son-sua-chong-tham',
    icon: 'format_paint',
    isActive: true,
  },
  {
    name: 'Đồ gỗ & Nội thất',
    slug: 'do-go-noi-that',
    icon: 'table_restaurant',
    isActive: true,
  },
];

const PROVIDERS_DATA = [
  {
    email: 'minh.dienlanh@servigo.vn',
    name: 'Lê Văn Minh',
    phone: '0981111001',
    image:
      'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400&q=80',
    categorySlug: 'sua-dien-lanh',
    bio: 'Kỹ sư nhiệt lạnh Bách Khoa hơn 6 năm kinh nghiệm tại Quận 9, chuyên điều hòa Daikin, Panasonic, Mitsubishi...',
    experienceYears: 6,
    isOnline: true,
    areaName: 'Trạm Hiệp Phú - Lê Văn Việt, Quận 9',
    centerLatitude: 10.8456,
    centerLongitude: 106.7719, // Tâm Ngã tư Thủ Đức - Hiệp Phú (0.0km)
    radiusKm: 15.0,
  },
  {
    email: 'dat.diennuoc@servigo.vn',
    name: 'Nguyễn Tiến Đạt',
    phone: '0981111002',
    image:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    categorySlug: 'sua-dien-nuoc',
    bio: 'Thợ điện nước tay nghề cao 8 năm tại các khu dân cư và chung cư Quận 9, TP. Thủ Đức.',
    experienceYears: 8,
    isOnline: true,
    areaName: 'Trạm Tăng Nhơn Phú A - Man Thiện, Quận 9',
    centerLatitude: 10.8485,
    centerLongitude: 106.7843, // ~1.4km từ tâm Quận 9
    radiusKm: 15.0,
  },
  {
    email: 'son.khoacuon@servigo.vn',
    name: 'Trần Hoàng Sơn',
    phone: '0981111003',
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    categorySlug: 'sua-khoa-cua-cuon',
    bio: 'Chuyên mở khóa, thay khóa cửa cuốn, vân tay, thẻ từ thông minh nhanh chóng 24/7 tại Quận 9.',
    experienceYears: 5,
    isOnline: true,
    areaName: 'Trạm Phước Long B - Đỗ Xuân Hợp, Quận 9',
    centerLatitude: 10.8235,
    centerLongitude: 106.7758, // ~2.5km từ tâm Quận 9
    radiusKm: 15.0,
  },
  {
    email: 'mai.vesinh@servigo.vn',
    name: 'Hoàng Thị Mai',
    phone: '0981111005',
    image:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
    categorySlug: 've-sinh-nha-cua',
    bio: 'Chuyên nghiệp, cẩn thận, trung thực. Đã phục vụ hơn 500 hộ gia đình tại Quận 9 & TP. Thủ Đức.',
    experienceYears: 4,
    isOnline: true,
    areaName: 'Trạm Tăng Nhơn Phú B - Dương Đình Hội, Quận 9',
    centerLatitude: 10.8268,
    centerLongitude: 106.7888, // ~2.8km từ tâm Quận 9
    radiusKm: 15.0,
  },
  {
    email: 'hung.thongtac@servigo.vn',
    name: 'Phạm Văn Hùng',
    phone: '0981111004',
    image:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
    categorySlug: 'thong-tac-ve-sinh',
    bio: 'Đội trưởng thông tắc công nghệ lò xo không đục phá tại Quận 9, xử lý triệt để mùi hôi bảo hành dài hạn.',
    experienceYears: 7,
    isOnline: true,
    areaName: 'Trạm Long Thạnh Mỹ - Khu Công Nghệ Cao, Quận 9',
    centerLatitude: 10.8548,
    centerLongitude: 106.8091, // ~4.2km từ tâm Quận 9
    radiusKm: 15.0,
  },
  {
    email: 'kiet.sonsua@servigo.vn',
    name: 'Đặng Tuấn Kiệt',
    phone: '0981111007',
    image:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',
    categorySlug: 'son-sua-chong-tham',
    bio: 'Chuyên gia chống thấm sân thượng, tường ẩm mốc và sơn sửa nhà ở trọn gói khu vực Quận 9, TP. Thủ Đức.',
    experienceYears: 7,
    isOnline: true,
    areaName: 'Trạm Tân Phú - Suối Tiên, Quận 9',
    centerLatitude: 10.866,
    centerLongitude: 106.8025, // ~4.0km từ tâm Quận 9
    radiusKm: 15.0,
  },
  {
    email: 'lam.noithat@servigo.vn',
    name: 'Bùi Thanh Lâm',
    phone: '0981111008',
    image:
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&q=80',
    categorySlug: 'do-go-noi-that',
    bio: 'Thợ mộc đóng sửa tủ bếp, giường tủ gỗ công nghiệp & tự nhiên, thay phụ kiện bản lề giảm chấn tại Quận 9.',
    experienceYears: 6,
    isOnline: true,
    areaName: 'Trạm Phú Hữu - Liên Phường, Quận 9',
    centerLatitude: 10.8065,
    centerLongitude: 106.792, // ~4.9km từ tâm Quận 9
    radiusKm: 15.0,
  },
  {
    email: 'thang.giadung@servigo.vn',
    name: 'Vũ Đức Thắng',
    phone: '0981111006',
    image:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80',
    categorySlug: 'thiet-bi-gia-dung',
    bio: 'Thợ sửa máy giặt, tủ lạnh, lò vi sóng các hãng LG, Electrolux, Bosch tại Vinhomes Grand Park, Quận 9.',
    experienceYears: 9,
    isOnline: false,
    areaName: 'Trạm Long Bình - Vinhomes Grand Park, Quận 9',
    centerLatitude: 10.842,
    centerLongitude: 106.8358, // ~7.0km từ tâm Quận 9
    radiusKm: 18.0,
  },
];

async function seed() {
  console.log('🚀 Khởi động kết nối database...');
  await dataSource.initialize();
  console.log('✅ Đã kết nối PostgreSQL thành công.');

  // Đảm bảo cột is_online tồn tại nếu DB chưa chạy phần ALTER TABLE bổ sung
  await dataSource.query(
    'ALTER TABLE "provider_profile" ADD COLUMN IF NOT EXISTS "is_online" boolean NOT NULL DEFAULT true',
  );

  const categoryRepo = dataSource.getRepository(ServiceCategory);
  const userRepo = dataSource.getRepository(User);
  const profileRepo = dataSource.getRepository(ProviderProfile);
  const areaRepo = dataSource.getRepository(ProviderServiceArea);
  const availabilityRepo = dataSource.getRepository(ProviderAvailability);
  const serviceRepo = dataSource.getRepository(Service);

  // 1. Upsert 8 danh mục chuẩn Servigo
  console.log('📦 Bắt đầu upsert 8 danh mục chuẩn Servigo...');
  const categoryMap = new Map<string, ServiceCategory>();
  for (const catData of CATEGORIES_DATA) {
    let cat = await categoryRepo.findOne({ where: { slug: catData.slug } });
    if (!cat) {
      cat = categoryRepo.create(catData);
    } else {
      cat.name = catData.name;
      cat.icon = catData.icon;
      cat.isActive = catData.isActive;
    }
    const savedCat = await categoryRepo.save(cat);
    categoryMap.set(savedCat.slug, savedCat);
  }
  console.log(`✅ Đã đồng bộ ${categoryMap.size} danh mục.`);

  // 2. Upsert 6 Nhà cung cấp mẫu
  console.log('👷 Bắt đầu tạo/cập nhật 6 Nhà cung cấp mẫu...');
  const providerProfileMap = new Map<string, ProviderProfile>();

  for (const pData of PROVIDERS_DATA) {
    // 2.1 User
    let user = await userRepo.findOne({ where: { email: pData.email } });
    if (!user) {
      user = userRepo.create({
        email: pData.email,
        name: pData.name,
        phone: pData.phone,
        image: pData.image,
        role: UserRole.PROVIDER,
        emailVerified: true,
      });
    } else {
      user.name = pData.name;
      user.phone = pData.phone;
      user.image = pData.image;
      user.role = UserRole.PROVIDER;
    }
    user = await userRepo.save(user);

    // 2.2 ProviderProfile
    let profile = await profileRepo.findOne({ where: { userId: user.id } });
    if (!profile) {
      profile = profileRepo.create({
        userId: user.id,
        displayName: pData.name,
        bio: pData.bio,
        experienceYears: pData.experienceYears,
        phone: pData.phone,
        isOnline: pData.isOnline,
        verificationStatus: VerificationStatus.APPROVED,
        approvedAt: new Date(),
      });
    } else {
      profile.displayName = pData.name;
      profile.bio = pData.bio;
      profile.experienceYears = pData.experienceYears;
      profile.phone = pData.phone;
      profile.isOnline = pData.isOnline;
      profile.verificationStatus = VerificationStatus.APPROVED;
      profile.approvedAt = profile.approvedAt || new Date();
    }
    profile = await profileRepo.save(profile);
    providerProfileMap.set(pData.email, profile);

    // 2.3 ProviderServiceArea
    let area = await areaRepo.findOne({ where: { providerId: profile.id } });
    if (!area) {
      area = areaRepo.create({
        providerId: profile.id,
        areaName: pData.areaName,
        centerLatitude: pData.centerLatitude,
        centerLongitude: pData.centerLongitude,
        radiusKm: pData.radiusKm,
        isActive: true,
      });
    } else {
      area.areaName = pData.areaName;
      area.centerLatitude = pData.centerLatitude;
      area.centerLongitude = pData.centerLongitude;
      area.radiusKm = pData.radiusKm;
      area.isActive = true;
    }
    await areaRepo.save(area);
  }
  console.log(
    `✅ Đã tạo/cập nhật ${PROVIDERS_DATA.length} Thợ APPROVED kèm vùng phục vụ.`,
  );

  // 3. Upsert 10 Dịch vụ ACTIVE mẫu (phủ kín 8 danh mục)
  console.log('🛠️ Bắt đầu tạo 10 dịch vụ ACTIVE mẫu...');
  const SERVICES_DATA = [
    {
      providerEmail: 'minh.dienlanh@servigo.vn',
      categorySlug: 'sua-dien-lanh',
      title: 'Bảo dưỡng & Vệ sinh điều hòa treo tường',
      description:
        'Vệ sinh chuyên sâu dàn nóng, dàn lạnh bằng máy bơm áp lực cao, kiểm tra áp suất gas và bổ sung ga R32/R410A miễn phí.',
      basePrice: 250000,
      priceUnit: PriceUnit.FIXED,
      durationMinutes: 60,
      status: ServiceStatus.ACTIVE,
    },
    {
      providerEmail: 'minh.dienlanh@servigo.vn',
      categorySlug: 'sua-dien-lanh',
      title: 'Nạp gas & Khắc phục xì gas điều hòa Inverter',
      description:
        'Kiểm tra dò rỉ đường ống đồng, hàn ống và hút chân không, nạp đầy đủ gas chuẩn hãng bảo hành 6 tháng.',
      basePrice: 450000,
      priceUnit: PriceUnit.FROM,
      durationMinutes: 90,
      status: ServiceStatus.ACTIVE,
    },
    {
      providerEmail: 'dat.diennuoc@servigo.vn',
      categorySlug: 'sua-dien-nuoc',
      title: 'Sửa chữa chập điện & Thay aptomat tại nhà',
      description:
        'Xử lý triệt để sự cố mất điện cục bộ, nhảy át liên tục, rò rỉ điện âm tường bằng thiết bị đo chuyên dụng an toàn tuyệt đối.',
      basePrice: 200000,
      priceUnit: PriceUnit.FIXED,
      durationMinutes: 45,
      status: ServiceStatus.ACTIVE,
    },
    {
      providerEmail: 'dat.diennuoc@servigo.vn',
      categorySlug: 'sua-dien-nuoc',
      title: 'Sửa đường ống nước rò rỉ & Thay vòi sen cao cấp',
      description:
        'Dò tìm điểm rò rỉ nước ngầm, thay thế phụ kiện đường ống PPR, PVC, lắp đặt thiết bị vệ sinh thẩm mỹ và bền đẹp.',
      basePrice: 180000,
      priceUnit: PriceUnit.FIXED,
      durationMinutes: 60,
      status: ServiceStatus.ACTIVE,
    },
    {
      providerEmail: 'son.khoacuon@servigo.vn',
      categorySlug: 'sua-khoa-cua-cuon',
      title: 'Mở khóa cửa tay gạt & Đánh chìa khóa cơ tại chỗ',
      description:
        'Mở khóa nhanh không hỏng ổ, sửa kẹt chìa, thay ruột khóa mới bảo mật cao trong 15 phút.',
      basePrice: 150000,
      priceUnit: PriceUnit.FIXED,
      durationMinutes: 30,
      status: ServiceStatus.ACTIVE,
    },
    {
      providerEmail: 'hung.thongtac@servigo.vn',
      categorySlug: 'thong-tac-ve-sinh',
      title: 'Thông tắc bồn cầu & Đường ống cống bằng máy lò xo',
      description:
        'Sử dụng máy thông lò xo công nghiệp không đục phá, loại bỏ hoàn toàn cặn dầu mỡ và rác thải, khử mùi hôi hiệu quả.',
      basePrice: 350000,
      priceUnit: PriceUnit.FIXED,
      durationMinutes: 60,
      status: ServiceStatus.ACTIVE,
    },
    {
      providerEmail: 'mai.vesinh@servigo.vn',
      categorySlug: 've-sinh-nha-cua',
      title: 'Dọn dẹp vệ sinh nhà ở chuyên sâu theo giờ',
      description:
        'Lau dọn sàn nhà, hút bụi thảm, làm sạch bếp, toilet bằng dung dịch sinh học an toàn cho trẻ nhỏ và thú cưng.',
      basePrice: 160000,
      priceUnit: PriceUnit.HOURLY,
      durationMinutes: 120,
      status: ServiceStatus.ACTIVE,
    },
    {
      providerEmail: 'thang.giadung@servigo.vn',
      categorySlug: 'thiet-bi-gia-dung',
      title: 'Sửa máy giặt lồng ngang không vắt & Kêu to',
      description:
        'Kiểm tra motor Inverter, thay thế dây curoa, bạc đạn, thụt giảm xóc chuẩn hãng, chạy thử êm ái trước khi bàn giao.',
      basePrice: 550000,
      priceUnit: PriceUnit.FROM,
      durationMinutes: 90,
      status: ServiceStatus.ACTIVE,
    },
    {
      providerEmail: 'kiet.sonsua@servigo.vn',
      categorySlug: 'son-sua-chong-tham',
      title: 'Chống thấm sân thượng, tường nhà & Sơn dặm vá thẩm mỹ',
      description:
        'Xử lý triệt để vết nứt chân chim, chống thấm ngược bằng vật liệu Sika/Kova chuẩn hãng, sơn phủ 2 lớp bền màu.',
      basePrice: 350000,
      priceUnit: PriceUnit.FROM,
      durationMinutes: 120,
      status: ServiceStatus.ACTIVE,
    },
    {
      providerEmail: 'lam.noithat@servigo.vn',
      categorySlug: 'do-go-noi-that',
      title: 'Sửa chữa tủ bếp, giường gỗ & Thay bản lề, ray trượt tại nhà',
      description:
        'Khắc phục xệ cánh tủ bếp, thay bản lề giảm chấn inox 304, ray trượt ngăn kéo và gia cố khung giường chắc chắn.',
      basePrice: 220000,
      priceUnit: PriceUnit.FIXED,
      durationMinutes: 60,
      status: ServiceStatus.ACTIVE,
    },
  ];

  for (const sData of SERVICES_DATA) {
    const profile = providerProfileMap.get(sData.providerEmail);
    const category = categoryMap.get(sData.categorySlug);

    if (!profile || !category) continue;

    let service = await serviceRepo.findOne({
      where: {
        providerId: profile.id,
        title: sData.title,
      },
    });

    if (!service) {
      service = serviceRepo.create({
        providerId: profile.id,
        categoryId: category.id,
        title: sData.title,
        description: sData.description,
        basePrice: sData.basePrice,
        priceUnit: sData.priceUnit,
        durationMinutes: sData.durationMinutes,
        status: sData.status,
      });
    } else {
      service.categoryId = category.id;
      service.description = sData.description;
      service.basePrice = sData.basePrice;
      service.priceUnit = sData.priceUnit;
      service.durationMinutes = sData.durationMinutes;
      service.status = sData.status;
    }

    await serviceRepo.save(service);
  }

  console.log(
    `✅ Đã tạo thành công ${SERVICES_DATA.length} dịch vụ ACTIVE mẫu.`,
  );

  // 4. Bổ sung lịch làm việc mẫu (Thứ 2 - Chủ nhật, 08:00 - 18:00) cho thợ chưa có lịch
  let seededSchedules = 0;
  for (const profile of providerProfileMap.values()) {
    const existingCount = await availabilityRepo.count({
      where: { providerId: profile.id },
    });
    if (existingCount > 0) continue;

    const blocks = Array.from({ length: 7 }, (_, dayOfWeek) =>
      availabilityRepo.create({
        providerId: profile.id,
        dayOfWeek,
        startTime: '08:00:00',
        endTime: '18:00:00',
        isActive: true,
      }),
    );
    await availabilityRepo.save(blocks);
    seededSchedules += 1;
  }
  console.log(
    `📅 Đã bổ sung lịch làm việc mẫu cho ${seededSchedules} nhà cung cấp.`,
  );

  console.log('🎉 Seed discovery data hoàn tất 100%!');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Lỗi chạy seed discovery:', err);
  process.exit(1);
});
