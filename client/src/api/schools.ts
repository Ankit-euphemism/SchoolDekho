import apiClient from './client';
import type { NearbySchool, NearbySchoolFilters, SchoolLocation } from '../types/school';

export interface SchoolProfileResponse {
  _id: string;
  name: string;
  description?: string;
  type: string;
  board: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  established?: number;
  fees?: {
    min?: number;
    max?: number;
  };
  facilities?: string[];
  photos?: string[];
  virtualTourUrl?: string;
  averageRating?: number;
  reviewCount?: number;
  location?: {
    coordinates?: [number, number];
  };
}

export interface SchoolReview {
  id: string;
  userName: string;
  rating: number;
  date: string;
  title?: string;
  body?: string;
  pros?: string;
  cons?: string;
  adminResponse?: {
    text: string;
    respondedAt: string;
  };
}

export interface SchoolReviewsResponse {
  reviews: SchoolReview[];
  page: number;
  totalPages: number;
  total: number;
  sort: 'recent' | 'highest' | 'lowest';
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface GetNearbySchoolsOptions {
  location: SchoolLocation;
  filters: NearbySchoolFilters;
  signal?: AbortSignal;
  page?: number;
  limit?: number;
  sortBy?: 'distance' | 'name' | 'averageRating' | 'reviewCount';
  sortOrder?: 'asc' | 'desc';
  includeMeta?: boolean;
}

export interface NearbySchoolsResponse {
  schools: NearbySchool[];
  pagination?: PaginationMeta;
  sort?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

export interface CreateReviewPayload {
  schoolId: string;
  rating: number;
  title: string;
  body: string;
  pros: string;
  cons: string;
}

interface NearbySchoolResponse {
  _id: string;
  name: string;
  type: NearbySchool['type'];
  board: NearbySchool['board'];
  address: string;
  location?: {
    coordinates?: [number, number];
  };
  averageRating?: number;
  reviewCount?: number;
  facilities?: string[];
  photos?: string[];
  distance?: number;
}

interface RawPaginatedSchoolsResponse {
  schools: NearbySchoolResponse[];
  pagination?: PaginationMeta;
  sort?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

export interface CreateSchoolPayload {
  name: string;
  type: 'primary' | 'secondary' | 'international';
  board: 'CBSE' | 'ICSE' | 'IB' | 'state';
  address: string;
  lat: number;
  lng: number;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  established?: number;
  facilities?: string[];
}

function mapNearbySchool(response: NearbySchoolResponse): NearbySchool {
  const [lat = 0, lng = 0] = response.location?.coordinates ?? [];

  return {
    id: response._id,
    name: response.name,
    address: response.address,
    type: response.type,
    board: response.board,
    averageRating: response.averageRating ?? 0,
    reviewCount: response.reviewCount ?? 0,
    facilities: response.facilities ?? [],
    photos: response.photos ?? [],
    distance: response.distance ?? 0,
    location: { lat, lng },
  };
}

export async function getNearbySchools({
  location,
  filters,
  signal,
  page = 1,
  limit = 20,
  sortBy = 'distance',
  sortOrder = 'asc',
  includeMeta = false,
}: GetNearbySchoolsOptions): Promise<NearbySchoolsResponse> {
  const params = new URLSearchParams({
    lat: String(location.lat),
    lng: String(location.lng),
    radius: String(filters.radiusKm),
    minRating: String(filters.minRating),
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
  });

  if (includeMeta) {
    params.set('includeMeta', 'true');
  }

  if (filters.types.length > 0) {
    params.set('type', filters.types.join(','));
  }

  if (filters.board !== 'all') {
    params.set('board', filters.board);
  }

  if (filters.facilities.length > 0) {
    params.set('facilities', filters.facilities.join(','));
  }

  const response = await apiClient.get<NearbySchoolResponse[] | RawPaginatedSchoolsResponse>('/schools/nearby', {
    params,
    signal,
  });

  // Handle both direct array response and paginated response
  if (Array.isArray(response.data)) {
    return {
      schools: response.data.map(mapNearbySchool),
    };
  }

  const paginatedResponse = response.data as RawPaginatedSchoolsResponse;
  return {
    schools: (paginatedResponse.schools || []).map(mapNearbySchool),
    pagination: paginatedResponse.pagination,
    sort: paginatedResponse.sort,
  };
}

export interface GetAllSchoolsOptions {
  signal?: AbortSignal;
  query?: string;
  type?: string[];
  board?: 'CBSE' | 'ICSE' | 'IB' | 'state';
  minRating?: number;
  maxRating?: number;
  facilities?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'averageRating' | 'reviewCount';
  sortOrder?: 'asc' | 'desc';
  includeMeta?: boolean;
}

export async function getAllSchools(
  options?: GetAllSchoolsOptions,
): Promise<NearbySchoolsResponse> {
  const {
    signal,
    query,
    type,
    board,
    minRating,
    maxRating,
    facilities,
    page = 1,
    limit = 20,
    sortBy = 'name',
    sortOrder = 'asc',
    includeMeta = false,
  } = options || {};

  const params = new URLSearchParams();

  if (query) {
    params.set('q', query);
  }

  if (type && type.length > 0) {
    params.set('type', type.join(','));
  }

  if (board) {
    params.set('board', board);
  }

  if (minRating !== undefined) {
    params.set('minRating', String(minRating));
  }

  if (maxRating !== undefined) {
    params.set('maxRating', String(maxRating));
  }

  if (facilities && facilities.length > 0) {
    params.set('facilities', facilities.join(','));
  }

  params.set('page', String(page));
  params.set('limit', String(limit));
  params.set('sortBy', sortBy);
  params.set('sortOrder', sortOrder);

  if (includeMeta) {
    params.set('includeMeta', 'true');
  }

  const response = await apiClient.get<NearbySchoolResponse[] | RawPaginatedSchoolsResponse>('/schools', { params, signal });

  // Handle both direct array response and paginated response
  if (Array.isArray(response.data)) {
    return {
      schools: response.data.map(mapNearbySchool),
    };
  }

  const paginatedResponse = response.data as RawPaginatedSchoolsResponse;
  return {
    schools: (paginatedResponse.schools || []).map(mapNearbySchool),
    pagination: paginatedResponse.pagination,
    sort: paginatedResponse.sort,
  };
}

export async function getSchoolById(
  schoolId: string,
  signal?: AbortSignal,
  options?: {
    silentToast?: boolean;
    successMessage?: string;
  },
) {
  const response = await apiClient.get<SchoolProfileResponse>(`/schools/${schoolId}`, {
    signal,
    silentToast: options?.silentToast,
    successMessage: options?.successMessage,
  });
  return response.data;
}

export async function createSchool(payload: CreateSchoolPayload) {
  const response = await apiClient.post<SchoolProfileResponse>('/schools', payload);
  return response.data;
}

export async function getSchoolReviews(
  schoolId: string,
  sort: 'recent' | 'highest' | 'lowest' = 'recent',
  page: number = 1,
  limit: number = 20,
  signal?: AbortSignal,
  options?: {
    silentToast?: boolean;
    successMessage?: string;
  },
): Promise<SchoolReviewsResponse> {
  const response = await apiClient.get<SchoolReviewsResponse>(
    `/reviews/school/${schoolId}`,
    {
      params: { sort, page, limit },
      signal,
      silentToast: options?.silentToast,
      successMessage: options?.successMessage,
    },
  );
  return response.data;
}

export async function createSchoolReview(
  payload: CreateReviewPayload,
  options?: {
    silentToast?: boolean;
    successMessage?: string;
  },
) {
  const response = await apiClient.post('/reviews', payload, {
    silentToast: options?.silentToast,
    successMessage: options?.successMessage,
  });
  return response.data;
}

// ─── Admin Dashboard API Calls ─────────────────────────────────────────────────

export interface AdminReview {
  _id: string;
  rating: number;
  title?: string;
  body?: string;
  pros?: string;
  cons?: string;
  createdAt: string;
  userId: {
    name: string;
    email: string;
  };
  adminResponse?: {
    text: string;
    respondedAt?: string;
  };
}

export interface AnalyticsData {
  totalProfileViews: number;
  averageRating: number;
  totalReviews: number;
  reviewsByMonth: Array<{
    month: string;
    reviews: number;
    rating: number;
  }>;
}

export interface AdminReviewsResponse {
  reviews: AdminReview[];
  page: number;
  totalPages: number;
  total: number;
}

export async function updateSchool(schoolId: string, data: Partial<SchoolProfileResponse>) {
  const response = await apiClient.put(`/schools/${schoolId}`, data);
  return response.data;
}

export async function uploadSchoolPhoto(schoolId: string, file: File) {
  const formData = new FormData();
  formData.append('photo', file);
  const response = await apiClient.post(`/schools/${schoolId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteSchoolPhoto(schoolId: string, photoUrl: string) {
  const encodedUrl = encodeURIComponent(photoUrl);
  const response = await apiClient.delete(`/schools/${schoolId}/photos/${encodedUrl}`);
  return response.data;
}

export async function getAdminReviews(
  schoolId: string,
  page = 1,
  limit = 8,
): Promise<AdminReviewsResponse> {
  const response = await apiClient.get<AdminReviewsResponse>(`/schools/${schoolId}/reviews`, {
    params: { page, limit },
  });
  return response.data;
}

export async function addAdminResponse(schoolId: string, reviewId: string, text: string) {
  const response = await apiClient.post(`/schools/${schoolId}/reviews/${reviewId}/respond`, { text });
  return response.data;
}

export async function incrementProfileViews(schoolId: string) {
  const response = await apiClient.post(`/schools/${schoolId}/view-increment`);
  return response.data;
}

export async function getSchoolAnalytics(schoolId: string) {
  const response = await apiClient.get<AnalyticsData>(`/schools/${schoolId}/analytics`);
  return response.data;
}