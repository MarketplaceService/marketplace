import { isInsideMapBounds } from "@/components/map/map-bounds";
import {
  geocodingService,
  isGeocodingDisabled,
  noteGeocodingError,
  type AddressSuggestion,
  type ResolvedPlace,
} from "@/services/geocoding.services";
import { useState } from "react";
import { toast } from "sonner";

const AREA_NAME_MAX_LENGTH = 255;
const round6 = (value: number) => parseFloat(value.toFixed(6));

/**
 * Tìm tâm vùng phục vụ bằng địa chỉ hoặc bằng nút định vị.
 * Chọn địa chỉ hay định vị thì tên khu vực đổi theo; kéo ghim thì giữ nguyên tên.
 */
export function useServiceAreaCenter({
  onCenterChange,
  onAreaNameChange,
}: {
  onCenterChange: (latitude: number, longitude: number) => void;
  onAreaNameChange: (areaName: string) => void;
}) {
  const [searchText, setSearchText] = useState("");

  const selectPlace = (place: ResolvedPlace, suggestion: AddressSuggestion) => {
    if (!isInsideMapBounds(place.latitude, place.longitude)) {
      toast.warning("Địa chỉ này nằm ngoài vùng bản đồ hỗ trợ");
      return;
    }
    onCenterChange(round6(place.latitude), round6(place.longitude));
    setSearchText(suggestion.description);
    onAreaNameChange(suggestion.description.slice(0, AREA_NAME_MAX_LENGTH));
  };

  // Tâm đã được bản đồ dời tới vị trí hiện tại, ở đây chỉ tra địa chỉ để đặt tên khu vực
  const describeLocation = async (latitude: number, longitude: number) => {
    if (isGeocodingDisabled()) return;
    try {
      const place = await geocodingService.reverse(latitude, longitude);
      if (!place?.formattedAddress) return;
      setSearchText(place.formattedAddress);
      onAreaNameChange(place.formattedAddress.slice(0, AREA_NAME_MAX_LENGTH));
    } catch (error) {
      noteGeocodingError(error);
    }
  };

  return { searchText, setSearchText, selectPlace, describeLocation };
}
