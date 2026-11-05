import { User } from './api.types';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type PriceUnit = 'FIXED' | 'HOURLY' | 'FROM';

export interface ProviderDocument {
  id: string;
  providerId: string;
  documentType: string;
  fileUrl: string;
  status: VerificationStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface ProviderServiceArea {
  id: string;
  providerId: string;
  areaName?: string | null;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string | null;
  experienceYears?: number | null;
  phone?: string | null;
  categoryId?: string | null;
  verificationStatus: VerificationStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  approver?: User | null;
  documents?: ProviderDocument[];
  serviceAreas?: ProviderServiceArea[];
}

export interface InitialServicePayload {
  title: string;
  basePrice: number;
  priceUnit: PriceUnit;
  durationMinutes: number;
}

export interface RegisterDocumentPayload {
  documentType: string;
  fileUrl: string;
}

export interface RegisterServiceAreaPayload {
  areaName?: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  isActive?: boolean;
}

export interface RegisterProviderPayload {
  displayName: string;
  phone: string;
  experienceYears: number;
  categoryId: string;
  bio?: string;
  initialService?: InitialServicePayload;
  documents: RegisterDocumentPayload[];
  serviceArea: RegisterServiceAreaPayload;
}

export interface UpdateProviderProfilePayload {
  displayName?: string;
  phone?: string;
  experienceYears?: number;
  categoryId?: string;
  bio?: string;
}

export interface CreateServiceAreaPayload {
  areaName?: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  isActive?: boolean;
}

export interface UpdateServiceAreaPayload {
  areaName?: string;
  centerLatitude?: number;
  centerLongitude?: number;
  radiusKm?: number;
  isActive?: boolean;
}

export interface CheckServiceAreaPayload {
  providerId: string;
  latitude: number;
  longitude: number;
}

export interface CheckServiceAreaResult {
  eligible: boolean;
  message: string;
  distanceKm: number | null;
  radiusKm: number | null;
  matchedAreaId: string | null;
}

export interface ProviderStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface ProvidersListResponse {
  items: ProviderProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: ProviderStats;
}

export interface ProvidersQueryFilters {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

