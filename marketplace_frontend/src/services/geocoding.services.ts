import axiosInstance from "@/lib/axios";
import { isAxiosError } from "axios";

export interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface ResolvedPlace {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  /** Số nhà và tên đường, nếu MapVina tách được */
  street: string | null;
  province: string | null;
  /** Địa chỉ theo đơn vị hành chính mới không còn cấp quận, nên thường là null */
  district: string | null;
  ward: string | null;
}

export interface NearPoint {
  latitude: number;
  longitude: number;
}

// Backend gọi MapVina bằng API key riêng; trình duyệt không bao giờ thấy key này
export const geocodingService = {
  autocomplete: async (input: string, near?: NearPoint) => {
    const { data } = await axiosInstance.get<AddressSuggestion[]>(
      "/geocoding/autocomplete",
      { params: { input, lat: near?.latitude, lng: near?.longitude } },
    );
    return data;
  },

  placeDetail: async (placeId: string) => {
    const { data } = await axiosInstance.get<ResolvedPlace | null>(
      `/geocoding/places/${encodeURIComponent(placeId)}`,
    );
    return data;
  },

  geocode: async (address: string) => {
    const { data } = await axiosInstance.get<ResolvedPlace | null>("/geocoding/geocode", {
      params: { address },
    });
    return data;
  },

  reverse: async (latitude: number, longitude: number) => {
    const { data } = await axiosInstance.get<ResolvedPlace | null>("/geocoding/reverse", {
      params: { lat: latitude, lng: longitude },
    });
    return data;
  },
};

/** Backend trả 503 khi chưa cấu hình MAPVINA_API_KEY */
export const isGeocodingUnavailable = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 503;

// Gặp 503 một lần thì ngừng gọi cho tới khi tải lại trang, tránh gửi request vô ích mỗi lần gõ
let geocodingDisabled = false;

export const isGeocodingDisabled = () => geocodingDisabled;

export function noteGeocodingError(error: unknown) {
  if (isGeocodingUnavailable(error)) geocodingDisabled = true;
}
