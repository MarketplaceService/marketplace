import {
  geocodingService,
  isGeocodingDisabled,
  noteGeocodingError,
  type NearPoint,
} from "@/services/geocoding.services";
import { useQuery } from "@tanstack/react-query";

export const MIN_SEARCH_LENGTH = 3;

/**
 * Gợi ý địa chỉ cho nội dung đang gõ. MapVina tính mỗi lần gọi vào hạn mức (gói miễn phí chỉ có
 * khoảng 200 lượt tìm kiếm mỗi ngày) nên chỉ gọi từ 3 ký tự, sau khi người dùng ngừng gõ
 */
export function useAddressSuggestions(input: string, near?: NearPoint) {
  const query = input.trim();
  // Làm tròn tọa độ để mỗi lần dời ghim một chút không tạo ra request mới
  const nearKey = near
    ? `${near.latitude.toFixed(2)},${near.longitude.toFixed(2)}`
    : null;

  return useQuery({
    queryKey: ["geocoding", "autocomplete", query, nearKey],
    queryFn: async () => {
      try {
        return await geocodingService.autocomplete(query, near);
      } catch (error) {
        noteGeocodingError(error);
        throw error;
      }
    },
    enabled: query.length >= MIN_SEARCH_LENGTH && !isGeocodingDisabled(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
