import axios from "axios";
import { toast } from "sonner";

const axiosInstance = axios.create({
  baseURL: "/api/nest",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const url = String(error.config?.url || "");
      // Do not hard-redirect on status queries like provider profile or current session check
      if (url.includes("/provider/me") || url.includes("/auth/me")) {
        return Promise.reject(error);
      }

      const path = window.location.pathname;
      if (path.startsWith("/auth/signin") || path.startsWith("/auth/signup")) {
        return Promise.reject(error);
      }

      const redirect = encodeURIComponent(path + window.location.search);

      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/auth/signin?redirect=${redirect}`;
    }

    if (error.response?.status === 403 && typeof window !== "undefined") {
      toast.error("Bạn không có quyền thực hiện thao tác này");
    }

    if (!error.response && typeof window !== "undefined") {
      toast.error("Không kết nối được máy chủ, vui lòng thử lại sau");
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
