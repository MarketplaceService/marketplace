import { useState } from "react";
import { toast } from "sonner";

function describeError(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Bạn đã chặn quyền vị trí. Hãy cho phép trong cài đặt trình duyệt rồi thử lại";
  }
  if (error.code === error.TIMEOUT) {
    return "Lấy vị trí quá lâu, bạn hãy thử lại";
  }
  return "Không lấy được vị trí hiện tại, bạn hãy chọn trên bản đồ";
}

/** Lấy tọa độ hiện tại của trình duyệt và báo rõ lý do khi không lấy được */
export function useCurrentLocation() {
  const [isLocating, setIsLocating] = useState(false);

  const locate = (onLocated: (latitude: number, longitude: number) => void) => {
    // Trình duyệt chỉ cho lấy vị trí trên https hoặc localhost, nên máy khác mở app
    // bằng địa chỉ IP trong mạng LAN sẽ luôn bị từ chối
    if (!window.isSecureContext) {
      toast.warning("Chỉ lấy được vị trí khi mở trang bằng https hoặc localhost");
      return;
    }
    if (!("geolocation" in navigator)) {
      toast.warning("Trình duyệt không hỗ trợ lấy vị trí");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsLocating(false);
        onLocated(coords.latitude, coords.longitude);
      },
      (error) => {
        setIsLocating(false);
        toast.warning(describeError(error));
      },
      // Người dùng chủ động bấm nút nên luôn lấy vị trí mới, không dùng vị trí cũ trình duyệt đã lưu
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  };

  return { locate, isLocating };
}
