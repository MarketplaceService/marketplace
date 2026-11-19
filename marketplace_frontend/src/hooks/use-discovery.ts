import {
  getCategories,
  getNearbyServices,
  getServiceDetail,
  getServices,
  searchServices,
} from "@/services/discovery.services";
import type {
  GetServicesParams,
  NearbyServiceItem,
  NearbyServicesParams,
  PaginatedServicesResponse,
  SearchServicesParams,
  ServiceCategoryItem,
  ServiceDetailItem,
} from "@/types/discovery.types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export const DISCOVERY_KEYS = {
  all: ["discovery"] as const,
  categories: () => [...DISCOVERY_KEYS.all, "categories"] as const,
  services: (params?: GetServicesParams) =>
    [...DISCOVERY_KEYS.all, "services", params] as const,
  search: (params?: SearchServicesParams) =>
    [...DISCOVERY_KEYS.all, "search", params] as const,
  nearby: (params: NearbyServicesParams) =>
    [...DISCOVERY_KEYS.all, "nearby", params] as const,
  detail: (id: string | null) => [...DISCOVERY_KEYS.all, "detail", id] as const,
};

export function useCategories() {
  return useQuery<ServiceCategoryItem[]>({
    queryKey: DISCOVERY_KEYS.categories(),
    queryFn: () => getCategories(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useServices(params?: GetServicesParams) {
  return useQuery<PaginatedServicesResponse>({
    queryKey: DISCOVERY_KEYS.services(params),
    queryFn: () => getServices(params),
    placeholderData: keepPreviousData,
  });
}

export function useSearchServices(
  params?: SearchServicesParams,
  enabled = true,
) {
  return useQuery<PaginatedServicesResponse>({
    queryKey: DISCOVERY_KEYS.search(params),
    queryFn: () => searchServices(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useNearbyServices(
  params: NearbyServicesParams,
  enabled = true,
) {
  return useQuery<NearbyServiceItem[]>({
    queryKey: DISCOVERY_KEYS.nearby(params),
    queryFn: () => getNearbyServices(params),
    placeholderData: keepPreviousData,
    enabled:
      enabled &&
      Number.isFinite(params.lat) &&
      Number.isFinite(params.lng),
  });
}

export function useServiceDetail(id: string | null) {
  return useQuery<ServiceDetailItem>({
    queryKey: DISCOVERY_KEYS.detail(id),
    queryFn: () => getServiceDetail(id as string),
    enabled: Boolean(id),
  });
}
