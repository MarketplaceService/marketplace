import { PriceUnit } from 'src/shared/types/price-unit.enum';
import { calculateBookingPrice } from './booking-pricing';

describe('calculateBookingPrice', () => {
  it('tính đúng giá FIXED với cự ly 0km và 3.0km (miễn phí di chuyển)', () => {
    const atZero = calculateBookingPrice({
      basePrice: 250000,
      priceUnit: PriceUnit.FIXED,
      durationMinutes: 60,
      distanceKm: 0,
    });
    expect(atZero.serviceSubtotal).toBe(250000);
    expect(atZero.distanceFee).toBe(0);
    expect(atZero.isFreeShipping).toBe(true);
    expect(atZero.totalPrice).toBe(250000);

    const atThree = calculateBookingPrice({
      basePrice: 250000,
      priceUnit: PriceUnit.FIXED,
      durationMinutes: 90,
      distanceKm: 3.0,
    });
    expect(atThree.serviceSubtotal).toBe(250000);
    expect(atThree.distanceFee).toBe(0);
    expect(atThree.isFreeShipping).toBe(true);
    expect(atThree.totalPrice).toBe(250000);
  });

  it('tính đúng phụ phí di chuyển tại 3.1km và 10km', () => {
    const atThreePointOne = calculateBookingPrice({
      basePrice: 300000,
      priceUnit: PriceUnit.FROM,
      durationMinutes: 60,
      distanceKm: 3.1,
    });
    expect(atThreePointOne.serviceSubtotal).toBe(300000);
    expect(atThreePointOne.isFreeShipping).toBe(false);
    expect(atThreePointOne.distanceFee).toBe(500);
    expect(atThreePointOne.totalPrice).toBe(300500);

    const atTen = calculateBookingPrice({
      basePrice: 300000,
      priceUnit: PriceUnit.FIXED,
      durationMinutes: 60,
      distanceKm: 10,
    });
    expect(atTen.distanceFee).toBe(35000);
    expect(atTen.totalPrice).toBe(335000);
  });

  it('nhân đơn giá HOURLY theo durationMinutes / 60 và làm tròn', () => {
    const hourly90m = calculateBookingPrice({
      basePrice: 200000,
      priceUnit: PriceUnit.HOURLY,
      durationMinutes: 90,
      distanceKm: 5.0,
    });
    expect(hourly90m.serviceSubtotal).toBe(300000);
    expect(hourly90m.distanceFee).toBe(10000);
    expect(hourly90m.totalPrice).toBe(310000);

    const hourly45m = calculateBookingPrice({
      basePrice: 150000,
      priceUnit: PriceUnit.HOURLY,
      durationMinutes: 45,
      distanceKm: 2.0,
    });
    expect(hourly45m.serviceSubtotal).toBe(112500);
    expect(hourly45m.totalPrice).toBe(112500);
  });
});
