import axiosInstance from "@/lib/axios";
import type {
  GetServicesParams,
  NearbyServiceItem,
  NearbyServicesParams,
  PaginatedServicesResponse,
  SearchServicesParams,
  ServiceCategoryItem,
  ServiceDetailItem,
} from "@/types/discovery.types";

export async function getCategories(): Promise<ServiceCategoryItem[]> {
  const { data } = await axiosInstance.get<ServiceCategoryItem[]>("/categories");
  return data;
}

export async function getServices(
  params?: GetServicesParams,
): Promise<PaginatedServicesResponse> {
  const { data } = await axiosInstance.get<PaginatedServicesResponse>("/services", {
    params,
  });
  return data;
}

export async function searchServices(
  params?: SearchServicesParams,
): Promise<PaginatedServicesResponse> {
  const { data } = await axiosInstance.get<PaginatedServicesResponse>("/services/search", {
    params,
  });
  return data;
}

export async function getNearbyServices(
  params: NearbyServicesParams,
): Promise<NearbyServiceItem[]> {
  const { data } = await axiosInstance.get<NearbyServiceItem[]>("/services/nearby", {
    params,
  });
  return data;
}

export async function getServiceDetail(id: string): Promise<ServiceDetailItem> {
  const { data } = await axiosInstance.get<ServiceDetailItem>(`/services/${id}`);
  return data;
}

export const discoveryService = {
  getCategories,
  getServices,
  searchServices,
  getNearbyServices,
  getServiceDetail,
};
