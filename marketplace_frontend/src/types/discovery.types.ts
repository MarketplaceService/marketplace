export type PriceUnit = "FIXED" | "HOURLY" | "FROM";
export type ServiceStatus = "DRAFT" | "PENDING" | "ACTIVE" | "REJECTED" | "INACTIVE";

export interface ServiceCategoryItem {
  id: string;
  name: string;
  slug: string;
  activeServicesCount: number;
  children?: ServiceCategoryItem[];
}

export interface ServiceCategoryBrief {
  id: string;
  name: string;
  slug: string;
}

export interface ServiceListItem {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  priceUnit: PriceUnit;
  durationMinutes: number;
  status: ServiceStatus;
  createdAt: string;
  category: ServiceCategoryBrief;
  provider: {
    id: string;
    userId: string;
    displayName: string;
    experienceYears: number;
    avatar: string | null;
    phone: string | null;
    areaName: string | null;
    isOnline: boolean;
  };
}

export interface PaginatedServicesResponse {
  items: ServiceListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ServiceDetailItem {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  priceUnit: PriceUnit;
  durationMinutes: number;
  status: ServiceStatus;
  createdAt: string;
  category: ServiceCategoryBrief;
  provider: {
    id: string;
    userId: string;
    displayName: string;
    bio: string | null;
    experienceYears: number;
    phone: string | null;
    avatar: string | null;
    verificationStatus: string;
    serviceAreas: Array<{
      id: string;
      areaName: string | null;
      centerLatitude: number;
      centerLongitude: number;
      radiusKm: number;
    }>;
  };
}

export interface NearbyServiceItem {
  service: {
    id: string;
    title: string;
    description: string;
    basePrice: number;
    priceUnit: PriceUnit;
    durationMinutes: number;
    category: ServiceCategoryBrief;
  };
  provider: {
    id: string;
    displayName: string;
    experienceYears: number;
    avatar: string | null;
    isOnline: boolean;
  };
  location: {
    areaName: string | null;
    latitude: number;
    longitude: number;
    providerRadiusKm: number;
  };
  distance: {
    distanceKm: number;
    distanceFee: number;
    isFreeShipping: boolean;
    estimatedTotal: number;
  };
}

export interface GetServicesParams {
  page?: number;
  limit?: number;
  sort?: "newest" | "rating" | "price_asc" | "price_desc";
}

export interface SearchServicesParams {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minExperienceYears?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "rating";
  page?: number;
  limit?: number;
}

export interface NearbyServicesParams {
  lat: number;
  lng: number;
  radius?: number;
  category?: string;
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
  minExperienceYears?: number;
  sort?: "distance" | "rating" | "price";
}
