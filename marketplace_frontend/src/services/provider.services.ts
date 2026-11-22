import axiosInstance from "@/lib/axios";

export interface ProviderDocumentItem {
  id?: string;
  documentType: string;
  fileUrl: string;
  status?: string;
  createdAt?: string;
}

export interface ProviderServiceAreaItem {
  id?: string;
  areaName?: string | null;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  isActive: boolean;
}

export interface ProviderInitialServiceItem {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  basePrice: number;
  priceUnit: "FIXED" | "HOURLY" | "FROM";
  durationMinutes: number;
  status: string;
  createdAt?: string;
}

export interface ProviderProfileData {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  experienceYears: number | null;
  phone: string | null;
  categoryId: string | null;
  categoryName?: string | null;
  isOnline?: boolean;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  approvedBy?: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  documents?: ProviderDocumentItem[];
  serviceAreas?: ProviderServiceAreaItem[];
  services?: ProviderInitialServiceItem[];
  user?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
  };
}

export interface ProviderStatusResponse {
  status: "UNREGISTERED" | "PENDING" | "APPROVED" | "REJECTED";
  profile: ProviderProfileData | null;
}

export interface RegisterProviderPayload {
  displayName: string;
  phone: string;
  experienceYears: number;
  categoryId: string;
  bio?: string;
  documents: { documentType: string; fileUrl: string }[];
  serviceArea?: {
    areaName?: string;
    centerLatitude: number;
    centerLongitude: number;
    radiusKm: number;
    isActive?: boolean;
  };
  initialService?: {
    title: string;
    basePrice: number;
    priceUnit: "FIXED" | "HOURLY" | "FROM";
    durationMinutes: number;
  };
}

export interface CheckServiceAreaPayload {
  latitude: number;
  longitude: number;
  providerId?: string;
  centerLatitude?: number;
  centerLongitude?: number;
  radiusKm?: number;
}

export interface CheckServiceAreaResponse {
  eligible: boolean;
  distanceKm: number | null;
  radiusKm: number | null;
  areaName?: string | null;
  message: string;
}

export interface AdminProviderListResponse {
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  items: ProviderProfileData[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export const providerServices = {
  getMyProfile: async (): Promise<ProviderStatusResponse> => {
    const { data } = await axiosInstance.get<ProviderStatusResponse>("/provider/me");
    return data;
  },

  register: async (payload: RegisterProviderPayload): Promise<ProviderStatusResponse> => {
    const { data } = await axiosInstance.post<ProviderStatusResponse>(
      "/provider/register",
      payload,
    );
    return data;
  },

  checkServiceArea: async (
    payload: CheckServiceAreaPayload,
  ): Promise<CheckServiceAreaResponse> => {
    const { data } = await axiosInstance.post<CheckServiceAreaResponse>(
      "/provider/service-areas/check",
      payload,
    );
    return data;
  },

  adminList: async (params?: {
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminProviderListResponse> => {
    const { data } = await axiosInstance.get<AdminProviderListResponse>(
      "/admin/providers",
      { params },
    );
    return data;
  },

  adminGetDetail: async (id: string): Promise<ProviderProfileData> => {
    const { data } = await axiosInstance.get<ProviderProfileData>(
      `/admin/providers/${id}`,
    );
    return data;
  },

  adminApprove: async (id: string): Promise<ProviderProfileData> => {
    const { data } = await axiosInstance.post<ProviderProfileData>(
      `/admin/providers/${id}/approve`,
    );
    return data;
  },

  adminReject: async (id: string, reason: string): Promise<ProviderProfileData> => {
    const { data } = await axiosInstance.post<ProviderProfileData>(
      `/admin/providers/${id}/reject`,
      { reason },
    );
    return data;
  },

  updateServiceArea: async (payload: UpdateServiceAreaPayload) => {
    const { data } = await axiosInstance.patch<ProviderStatusResponse>(
      "/provider/service-area",
      payload,
    );
    return data;
  },

  updateMyStatus: async (isOnline: boolean) => {
    const { data } = await axiosInstance.patch<{ id: string; isOnline: boolean }>(
      "/provider/me/status",
      { isOnline },
    );
    return data;
  },

  getPublicProfile: async (id: string) => {
    const { data } = await axiosInstance.get<PublicProviderProfile>(`/providers/${id}`);
    return data;
  },
};

export interface UpdateServiceAreaPayload {
  areaName?: string;
  centerLatitude: number;
  centerLongitude: number;
  /** 2–20 km */
  radiusKm: number;
}

export interface PublicProviderServiceItem {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  basePrice: number;
  priceUnit: "FIXED" | "HOURLY" | "FROM";
  durationMinutes: number;
}

/** Hồ sơ công khai của thợ. Không có tọa độ tâm vùng phục vụ vì đó có thể là nhà riêng */
export interface PublicProviderProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  /** Form đăng ký lưu tên ngành nghề vào đây, ví dụ "1. Điện lạnh (...)" */
  category: string | null;
  experienceYears: number | null;
  isOnline: boolean;
  verifiedAt: string | null;
  serviceArea: { areaName: string | null; radiusKm: number } | null;
  services: PublicProviderServiceItem[];
}

