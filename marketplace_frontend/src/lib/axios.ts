import axios, { AxiosError } from "axios";
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
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname;

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
