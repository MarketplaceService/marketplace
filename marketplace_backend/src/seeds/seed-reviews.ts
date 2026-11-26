import dataSource from '../config/database/data-source';
import { User } from '../app/user/entities/user.entity';
import { Address } from '../app/address/entities/address.entity';
import { ProviderProfile } from '../app/provider/entities/provider-profile.entity';
import { Service } from '../app/service/entities/service.entity';
import { Booking } from '../app/booking/entities/booking.entity';
import { BookingStatusHistory } from '../app/booking/entities/booking-status-history.entity';
import { Review } from '../app/review/entities/review.entity';
import type {
  BookingAddressSnapshot,
  BookingInspectionData,
} from '../app/booking/booking.types';
import { UserRole } from '../shared/types/user-role.enum';
import { BookingStatus } from '../shared/types/booking-status.enum';
import { PriceUnit } from '../shared/types/price-unit.enum';
import { v7 as uuidv7 } from 'uuid';

function buildAddressSnapshot(
  address: Address,
  service: Service,
): BookingAddressSnapshot {
  const basePrice = Number(service.basePrice) || 250000;
  return {
    addressId: address.id,
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? null,
    ward: address.ward,
    district: address.district ?? null,
    city: address.city,
    postalCode: address.postalCode ?? null,
    latitude: Number(address.latitude),
    longitude: Number(address.longitude),
    distanceKm: 1.5,
    distanceFee: 0,
    basePriceSnapshot: basePrice,
    priceUnitSnapshot: service.priceUnit || PriceUnit.FIXED,
    durationMinutesSnapshot: Number(service.durationMinutes) || 60,
  };
}

function buildInspectionData(
  beforeUrl: string,
  afterUrl: string,
  startedAt: Date,
  completedAt: Date,
  options?: { includeSensitive?: boolean },
): BookingInspectionData {
  return {
    before: [
      {
        url: beforeUrl,
        caption: 'Hiện trạng trước khi thực hiện dịch vụ',
        capturedAt: startedAt.toISOString(),
      },
    ],
    after: [
      {
        url: afterUrl,
        caption: 'Hoàn tất kiểm tra & bàn giao thiết bị',
        capturedAt: completedAt.toISOString(),
      },
    ],
    ...(options?.includeSensitive
      ? {
          initial: [
            {
              url: 'https://example.com/sensitive-initial.jpg',
              capturedAt: startedAt.toISOString(),
            },
          ],
          fieldNote: 'Ghi chú kỹ thuật bí mật (không lộ ra ngoài)',
        }
      : {}),
    submittedAt: completedAt.toISOString(),
  };
}

async function seedReviews() {
  console.log('🚀 Khởi động kết nối database để seed dữ liệu mẫu Module 06...');
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  const userRepo = dataSource.getRepository(User);
  const addressRepo = dataSource.getRepository(Address);
  const providerRepo = dataSource.getRepository(ProviderProfile);
  const serviceRepo = dataSource.getRepository(Service);
  const bookingRepo = dataSource.getRepository(Booking);
  const historyRepo = dataSource.getRepository(BookingStatusHistory);
  const reviewRepo = dataSource.getRepository(Review);

  // 1. Tạo hoặc lấy tài khoản Customer test
  let customer = await userRepo.findOne({
    where: { email: 'customer@servigo.vn' },
  });

  if (!customer) {
    customer = userRepo.create({
      email: 'customer@servigo.vn',
      name: 'Nguyễn Văn Khách',
      phone: '0901234567',
      role: UserRole.CUSTOMER,
      isAnonymous: false,
    });
    await userRepo.save(customer);
    console.log('✅ Đã tạo tài khoản khách hàng test: customer@servigo.vn');
  } else {
    console.log(
      'ℹ️ Đã tìm thấy tài khoản khách hàng test: customer@servigo.vn',
    );
  }

  // 2. Tạo địa chỉ cho Customer
  let address = await addressRepo.findOne({
    where: { userId: customer.id },
  });

  if (!address) {
    address = addressRepo.create({
      userId: customer.id,
      fullName: 'Nguyễn Văn Khách',
      phone: '0901234567',
      addressLine1: '123 Lê Văn Việt',
      ward: 'Hiệp Phú',
      district: 'Quận 9',
      city: 'Hồ Chí Minh',
      latitude: 10.8456,
      longitude: 106.7719,
      isDefault: true,
    });
    await addressRepo.save(address);
    console.log('✅ Đã tạo địa chỉ mẫu cho khách hàng.');
  }

  // 3. Lấy 1 Thợ (Provider) và dịch vụ tương ứng
  const provider = await providerRepo.findOne({
    where: {},
    relations: { user: true },
  });

  if (!provider) {
    console.error(
      '❌ Chưa có dữ liệu thợ. Vui lòng chạy pnpm run seed:discovery trước!',
    );
    process.exit(1);
  }

  const service = await serviceRepo.findOne({
    where: { providerId: provider.id },
  });
  if (!service) {
    console.error('❌ Thợ chưa có dịch vụ nào.');
    process.exit(1);
  }

  console.log(
    `👷 Sử dụng thợ mẫu: ${provider.user?.name || provider.id} (${provider.id})`,
  );
  console.log(`🔧 Dịch vụ: ${service.title} (${service.id})`);

  // Xóa các booking test cũ của khách hàng này để seed lại cho sạch
  const oldBookings = await bookingRepo.find({
    where: { customerId: customer.id, providerId: provider.id },
    relations: { review: true },
  });
  if (oldBookings.length > 0) {
    for (const b of oldBookings) {
      if (b.review) await reviewRepo.remove(b.review);
      await historyRepo.delete({ bookingId: b.id });
      await bookingRepo.remove(b);
    }
    console.log(`🧹 Đã làm sạch ${oldBookings.length} đơn test cũ.`);
  }

  const now = new Date();
  const addressSnapshot = buildAddressSnapshot(address, service);
  const totalPrice = addressSnapshot.basePriceSnapshot;

  // 4. Tạo Đơn 1: Đã COMPLETED & ĐÃ ĐÁNH GIÁ 5 SAO
  const booking1Start = new Date(now.getTime() - 2 * 24 * 3600 * 1000);
  const booking1End = new Date(booking1Start.getTime() + 2 * 3600 * 1000);
  const b1CreatedAt = new Date(booking1Start.getTime() - 3600 * 1000);
  const b1ConfirmedAt = new Date(b1CreatedAt.getTime() + 10 * 60 * 1000);
  const b1InProgressAt = new Date(booking1Start.getTime() + 5 * 60 * 1000);
  const b1CompletedAt = new Date(booking1End.getTime());

  const booking1: Booking = await bookingRepo.save({
    id: uuidv7(),
    bookingCode: `SVG-${Date.now().toString().slice(-6)}-01`,
    customerId: customer.id,
    providerId: provider.id,
    serviceId: service.id,
    addressId: address.id,
    scheduledStartAt: booking1Start,
    scheduledEndAt: booking1End,
    totalPrice,
    serviceTitleSnapshot: service.title,
    serviceAddressSnapshot: addressSnapshot,
    inspectionImages: buildInspectionData(
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&q=80',
      b1InProgressAt,
      b1CompletedAt,
      { includeSensitive: true },
    ),
    status: BookingStatus.COMPLETED,
  } as unknown as Booking);

  await historyRepo.save([
    historyRepo.create({
      id: uuidv7(),
      bookingId: booking1.id,
      oldStatus: null,
      newStatus: BookingStatus.PENDING,
      createdAt: b1CreatedAt,
    }),
    historyRepo.create({
      id: uuidv7(),
      bookingId: booking1.id,
      oldStatus: BookingStatus.PENDING,
      newStatus: BookingStatus.CONFIRMED,
      createdAt: b1ConfirmedAt,
    }),
    historyRepo.create({
      id: uuidv7(),
      bookingId: booking1.id,
      oldStatus: BookingStatus.CONFIRMED,
      newStatus: BookingStatus.IN_PROGRESS,
      createdAt: b1InProgressAt,
    }),
    historyRepo.create({
      id: uuidv7(),
      bookingId: booking1.id,
      oldStatus: BookingStatus.IN_PROGRESS,
      newStatus: BookingStatus.COMPLETED,
      createdAt: b1CompletedAt,
    }),
  ]);

  const review1 = reviewRepo.create({
    id: uuidv7(),
    bookingId: booking1.id,
    rating: 5,
    priceMatched: true,
    comment:
      'Thợ đến đúng giờ hẹn, tác phong rất chuyên nghiệp, xử lý sạch sẽ và đúng giá niêm yết ban đầu không phát sinh.',
  });
  await reviewRepo.save(review1);
  console.log(
    `⭐️ Đã tạo Đơn 1 (${booking1.bookingCode}) kèm Đánh giá 5 sao & ảnh Before/After.`,
  );

  // 5. Tạo Đơn 2: Đã COMPLETED & ĐÃ ĐÁNH GIÁ 4 SAO
  const booking2Start = new Date(now.getTime() - 1 * 24 * 3600 * 1000);
  const booking2End = new Date(booking2Start.getTime() + 2 * 3600 * 1000);
  const b2CreatedAt = new Date(booking2Start.getTime() - 2500 * 1000);
  const b2ConfirmedAt = new Date(b2CreatedAt.getTime() + 15 * 60 * 1000);
  const b2InProgressAt = new Date(booking2Start.getTime() + 10 * 60 * 1000);
  const b2CompletedAt = new Date(booking2End.getTime());

  const booking2: Booking = await bookingRepo.save({
    id: uuidv7(),
    bookingCode: `SVG-${Date.now().toString().slice(-6)}-02`,
    customerId: customer.id,
    providerId: provider.id,
    serviceId: service.id,
    addressId: address.id,
    scheduledStartAt: booking2Start,
    scheduledEndAt: booking2End,
    totalPrice,
    serviceTitleSnapshot: service.title,
    serviceAddressSnapshot: addressSnapshot,
    inspectionImages: buildInspectionData(
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
      b2InProgressAt,
      b2CompletedAt,
    ),
    status: BookingStatus.COMPLETED,
  } as unknown as Booking);

  await historyRepo.save([
    historyRepo.create({
      id: uuidv7(),
      bookingId: booking2.id,
      oldStatus: null,
      newStatus: BookingStatus.PENDING,
      createdAt: b2CreatedAt,
    }),
    historyRepo.create({
      id: uuidv7(),
      bookingId: booking2.id,
      oldStatus: BookingStatus.PENDING,
      newStatus: BookingStatus.CONFIRMED,
      createdAt: b2ConfirmedAt,
    }),
    historyRepo.create({
      id: uuidv7(),
      bookingId: booking2.id,
      oldStatus: BookingStatus.CONFIRMED,
      newStatus: BookingStatus.IN_PROGRESS,
      createdAt: b2InProgressAt,
    }),
    historyRepo.create({
      id: uuidv7(),
      bookingId: booking2.id,
      oldStatus: BookingStatus.IN_PROGRESS,
      newStatus: BookingStatus.COMPLETED,
      createdAt: b2CompletedAt,
    }),
  ]);

  const review2 = reviewRepo.create({
    id: uuidv7(),
    bookingId: booking2.id,
    rating: 4,
    priceMatched: true,
    comment: 'Tay nghề thợ tốt, nhiệt tình hỗ trợ, giá cả minh bạch.',
  });
  await reviewRepo.save(review2);
  console.log(`⭐️ Đã tạo Đơn 2 (${booking2.bookingCode}) kèm Đánh giá 4 sao.`);

  // 6. Tạo Đơn 3: Đã COMPLETED nhưng CHƯA ĐÁNH GIÁ (DÀNH CHO BẠN TỰ TEST TRÊN UI!)
  const booking3Start = new Date(now.getTime() - 4 * 3600 * 1000);
  const booking3End = new Date(now.getTime() - 2 * 3600 * 1000);
  const booking3: Booking = await bookingRepo.save({
    id: uuidv7(),
    bookingCode: `SVG-${Date.now().toString().slice(-6)}-03`,
    customerId: customer.id,
    providerId: provider.id,
    serviceId: service.id,
    addressId: address.id,
    scheduledStartAt: booking3Start,
    scheduledEndAt: booking3End,
    totalPrice,
    serviceTitleSnapshot: service.title,
    serviceAddressSnapshot: addressSnapshot,
    inspectionImages: buildInspectionData(
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80',
      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&q=80',
      booking3Start,
      booking3End,
    ),
    status: BookingStatus.COMPLETED,
  } as unknown as Booking);

  await historyRepo.save([
    historyRepo.create({
      id: uuidv7(),
      bookingId: booking3.id,
      oldStatus: null,
      newStatus: BookingStatus.PENDING,
      createdAt: new Date(booking3Start.getTime() - 1800 * 1000),
    }),
    historyRepo.create({
      id: uuidv7(),
      bookingId: booking3.id,
      oldStatus: BookingStatus.PENDING,
      newStatus: BookingStatus.CONFIRMED,
      createdAt: new Date(booking3Start.getTime() - 1000 * 1000),
    }),
    historyRepo.create({
      id: uuidv7(),
      bookingId: booking3.id,
      oldStatus: BookingStatus.CONFIRMED,
      newStatus: BookingStatus.IN_PROGRESS,
      createdAt: booking3Start,
    }),
    historyRepo.create({
      id: uuidv7(),
      bookingId: booking3.id,
      oldStatus: BookingStatus.IN_PROGRESS,
      newStatus: BookingStatus.COMPLETED,
      createdAt: booking3End,
    }),
  ]);

  console.log(`\n🎉 SEED DỮ LIỆU TEST MODULE 06 HOÀN TẤT THÀNH CÔNG!`);
  console.log(
    `================================================================`,
  );
  console.log(`📌 THÔNG TIN ĐỂ BẠN TEST TRÊN TRÌNH DUYỆT (UI):`);
  console.log(
    `1. Đơn hàng CHƯA ĐÁNH GIÁ (đang mở để bạn tự tay test đánh giá):`,
  );
  console.log(`   - Mã đơn: ${booking3.bookingCode}`);
  console.log(`   - ID đơn: ${booking3.id}`);
  console.log(
    `   - Link test trên Web: http://localhost:3000/bookings/${booking3.id}`,
  );
  console.log(`\n2. Hồ sơ Thợ có Biểu đồ Radar 5 trục và Danh sách đánh giá:`);
  console.log(`   - Tên thợ: ${provider.user?.name || 'Thợ Servigo'}`);
  console.log(`   - ID Thợ: ${provider.id}`);
  console.log(
    `   - Link xem Radar & Review: http://localhost:3000/providers/${provider.id}`,
  );
  console.log(
    `================================================================\n`,
  );

  await dataSource.destroy();
}

seedReviews().catch((err) => {
  console.error('❌ Lỗi khi seed review:', err);
  process.exit(1);
});
