import { RADAR_CONFIG } from './review.constants';

export function roundRadarScore(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 10) / 10;
}

export function calculatePunctualityScore(
  items: Array<{ scheduledStartAt: Date; startedAt: Date }>,
): { score: number; onTimeCount: number; totalStartedCount: number } {
  const totalStartedCount = items.length;
  if (totalStartedCount === 0) {
    return { score: 0, onTimeCount: 0, totalStartedCount: 0 };
  }

  const graceMs = RADAR_CONFIG.PUNCTUALITY_GRACE_MINUTES * 60_000;
  let onTimeCount = 0;
  for (const item of items) {
    if (item.startedAt.getTime() <= item.scheduledStartAt.getTime() + graceMs) {
      onTimeCount += 1;
    }
  }

  return {
    score: roundRadarScore(
      (RADAR_CONFIG.MAX_SCORE * onTimeCount) / totalStartedCount,
    ),
    onTimeCount,
    totalStartedCount,
  };
}

export function calculatePriceAdherenceScore(
  matchedCount: number,
  totalReviewCount: number,
): number {
  if (totalReviewCount <= 0) return 0;
  return roundRadarScore(
    (RADAR_CONFIG.MAX_SCORE * matchedCount) / totalReviewCount,
  );
}

export function calculateSkillQualityScore(
  averageRating: number,
  totalReviewCount: number,
): number {
  if (totalReviewCount <= 0) return 0;
  return roundRadarScore(averageRating);
}

export function calculateCompletionRateScore(
  completedCount: number,
  denominatorCount: number,
): number {
  if (denominatorCount <= 0) return 0;
  return roundRadarScore(
    (RADAR_CONFIG.MAX_SCORE * completedCount) / denominatorCount,
  );
}

export function calculateAcceptanceSpeedScore(responseMinutesList: number[]): {
  score: number;
  avgResponseMinutes: number | null;
  respondedCount: number;
} {
  const respondedCount = responseMinutesList.length;
  if (respondedCount === 0) {
    return { score: 0, avgResponseMinutes: null, respondedCount: 0 };
  }

  const totalMinutes = responseMinutesList.reduce(
    (sum, mins) => sum + Math.max(0, mins),
    0,
  );
  const avgMinutes = totalMinutes / respondedCount;

  const {
    ACCEPTANCE_FAST_MINUTES,
    ACCEPTANCE_FAST_SCORE,
    ACCEPTANCE_SLOW_MINUTES,
    ACCEPTANCE_SLOW_SCORE,
  } = RADAR_CONFIG;

  let rawScore: number;
  if (avgMinutes <= ACCEPTANCE_FAST_MINUTES) {
    rawScore = ACCEPTANCE_FAST_SCORE;
  } else if (avgMinutes >= ACCEPTANCE_SLOW_MINUTES) {
    rawScore = ACCEPTANCE_SLOW_SCORE;
  } else {
    const ratio =
      (avgMinutes - ACCEPTANCE_FAST_MINUTES) /
      (ACCEPTANCE_SLOW_MINUTES - ACCEPTANCE_FAST_MINUTES);
    rawScore =
      ACCEPTANCE_FAST_SCORE -
      ratio * (ACCEPTANCE_FAST_SCORE - ACCEPTANCE_SLOW_SCORE);
  }

  return {
    score: roundRadarScore(rawScore),
    avgResponseMinutes: Math.round(avgMinutes * 10) / 10,
    respondedCount,
  };
}
