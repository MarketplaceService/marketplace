import {
  apiBadRequest,
  apiConflict,
  apiForbidden,
} from 'src/shared/helpers/api-i18n';
import { BookingStatus } from 'src/shared/types/booking-status.enum';
import { BookingInspectionData } from './booking.types';

export type BookingActorRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';

interface TransitionRule {
  from: BookingStatus;
  to: BookingStatus;
  allowedActors: BookingActorRole[];
  requireInspectionImages?: boolean;
}

const TERMINAL_STATUSES = new Set<BookingStatus>([
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.REJECTED,
]);

const TRANSITION_RULES: TransitionRule[] = [
  {
    from: BookingStatus.PENDING,
    to: BookingStatus.CONFIRMED,
    allowedActors: ['PROVIDER'],
  },
  {
    from: BookingStatus.PENDING,
    to: BookingStatus.REJECTED,
    allowedActors: ['PROVIDER'],
  },
  {
    from: BookingStatus.PENDING,
    to: BookingStatus.CANCELLED,
    allowedActors: ['CUSTOMER', 'PROVIDER', 'ADMIN'],
  },
  {
    from: BookingStatus.CONFIRMED,
    to: BookingStatus.IN_PROGRESS,
    allowedActors: ['PROVIDER'],
  },
  {
    from: BookingStatus.CONFIRMED,
    to: BookingStatus.CANCELLED,
    allowedActors: ['CUSTOMER', 'PROVIDER', 'ADMIN'],
  },
  {
    from: BookingStatus.IN_PROGRESS,
    to: BookingStatus.COMPLETED,
    allowedActors: ['CUSTOMER'],
    requireInspectionImages: true,
  },
];

export function hasRequiredInspectionPhotos(
  inspection?: BookingInspectionData | null,
): boolean {
  return Boolean(
    inspection?.before &&
    inspection.before.length >= 1 &&
    inspection?.after &&
    inspection.after.length >= 1,
  );
}

export function assertBookingTransition(input: {
  currentStatus: BookingStatus;
  targetStatus: BookingStatus;
  actor: BookingActorRole;
  hasInspectionImages?: boolean;
}): void {
  const { currentStatus, targetStatus, actor, hasInspectionImages } = input;

  if (TERMINAL_STATUSES.has(currentStatus)) {
    apiConflict('errors.booking.invalidTransition');
  }

  if (
    currentStatus === BookingStatus.IN_PROGRESS &&
    targetStatus === BookingStatus.CANCELLED
  ) {
    apiConflict('errors.booking.cannotCancelInProgress');
  }

  const rule = TRANSITION_RULES.find(
    (item) => item.from === currentStatus && item.to === targetStatus,
  );

  if (!rule) {
    apiConflict('errors.booking.invalidTransition');
  }

  if (!rule.allowedActors.includes(actor)) {
    apiForbidden('errors.booking.forbidden');
  }

  if (rule.requireInspectionImages && !hasInspectionImages) {
    apiBadRequest('errors.booking.missingInspectionImages');
  }
}
