import axiosInstance from "@/lib/axios";
import type { InspectionPhoto } from "@/types/booking.types";

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

  uploadDocument: async (file: File): Promise<{ fileUrl: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    // Ghi đè Content-Type mặc định để axios gửi đúng multipart/form-data
    const { data } = await axiosInstance.post<{ fileUrl: string }>(
      "/provider/documents/upload",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
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

  getProviderReviews: async (
    id: string,
    params?: { page?: number; limit?: number },
  ) => {
    const { data } = await axiosInstance.get<ProviderReviewsResponse>(
      `/providers/${id}/reviews`,
      { params },
    );
    return data;
  },

  getProviderRadar: async (id: string) => {
    const { data } = await axiosInstance.get<ProviderRadarResponse>(
      `/providers/${id}/radar`,
    );
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
  ratingAverage: number;
  reviewCount: number;
  serviceArea: { areaName: string | null; radiusKm: number } | null;
  services: PublicProviderServiceItem[];
}

export interface ProviderReviewItem {
  id: string;
  bookingId: string;
  rating: number;
  priceMatched: boolean;
  comment: string | null;
  createdAt: string;
  serviceTitle: string;
  customer: {
    name: string;
    ward: string | null;
    avatarUrl: string | null;
  };
  inspectionImages: {
    before: InspectionPhoto[];
    after: InspectionPhoto[];
  } | null;
}

export interface ProviderReviewsResponse {
  ratingAverage: number;
  reviewCount: number;
  items: ProviderReviewItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProviderRadarResponse {
  providerId: string;
  reviewCount: number;
  ratingAverage: number;
  punctuality: number;
  priceAdherence: number;
  skillQuality: number;
  completionRate: number;
  acceptanceSpeed: number;
  metrics: {
    punctuality: {
      score: number;
      onTimeCount: number;
      totalStartedCount: number;
    };
    priceAdherence: {
      score: number;
      matchedCount: number;
      totalReviewCount: number;
    };
    skillQuality: {
      score: number;
      averageRating: number;
      totalReviewCount: number;
    };
    completionRate: {
      score: number;
      completedCount: number;
      denominatorCount: number;
    };
    acceptanceSpeed: {
      score: number;
      avgResponseMinutes: number | null;
      respondedCount: number;
    };
  };
}

