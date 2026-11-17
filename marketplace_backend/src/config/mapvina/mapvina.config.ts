import { registerAs } from '@nestjs/config';

export const MAPVINA_CONFIG = 'mapvina';

export type MapVinaConfig = {
  // REST API key của MapVina, chỉ dùng ở backend. Không có key thì các route tìm địa chỉ trả 503
  apiKey: string | null;
  baseUrl: string;
};

export default registerAs(MAPVINA_CONFIG, (): MapVinaConfig => ({
  apiKey: process.env.MAPVINA_API_KEY?.trim() || null,
  // Nhóm API v2 trả dữ liệu theo chuẩn Google Maps (Places, Geocoding)
  baseUrl: 'https://maps.mapvina.com/api/v2/',
}));
