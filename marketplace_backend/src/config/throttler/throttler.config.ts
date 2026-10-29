import { registerAs } from '@nestjs/config';

export const THROTTLER_COFIG = 'throttler';

export default registerAs(THROTTLER_COFIG, () => ({
  ttl: parseInt(process.env.THROTTLE_TTL_MS ?? '1000', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT ?? '60', 10),
}));
