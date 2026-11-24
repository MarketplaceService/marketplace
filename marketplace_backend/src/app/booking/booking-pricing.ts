import { calculateDistanceFee } from 'src/app/service/service.service';
import { PriceUnit } from 'src/shared/types/price-unit.enum';

export interface CalculateBookingPriceInput {
  basePrice: number;
  priceUnit: PriceUnit;
  durationMinutes: number;
  distanceKm: number;
}

export interface BookingPriceBreakdown {
  basePrice: number;
  priceUnit: PriceUnit;
  durationMinutes: number;
  serviceSubtotal: number;
  distanceKm: number;
  distanceFee: number;
  isFreeShipping: boolean;
  totalPrice: number;
}

export function calculateBookingPrice({
  basePrice,
  priceUnit,
  durationMinutes,
  distanceKm,
}: CalculateBookingPriceInput): BookingPriceBreakdown {
  const normalizedBasePrice = Math.round(Number(basePrice));
  const roundedDistanceKm = Math.max(0, Math.round(distanceKm * 10) / 10);

  const serviceSubtotal =
    priceUnit === PriceUnit.HOURLY
      ? Math.round(normalizedBasePrice * (durationMinutes / 60))
      : normalizedBasePrice;

  const { distanceFee, isFreeShipping } =
    calculateDistanceFee(roundedDistanceKm);

  return {
    basePrice: normalizedBasePrice,
    priceUnit,
    durationMinutes,
    serviceSubtotal,
    distanceKm: roundedDistanceKm,
    distanceFee,
    isFreeShipping,
    totalPrice: serviceSubtotal + distanceFee,
  };
}
