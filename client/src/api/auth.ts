import apiClient from './client';
import type { SchoolProfileResponse } from './schools';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'parent' | 'school-admin';
  schoolId?: string;
}

export interface AdminInfo {
  user: AuthUser;
  school: SchoolProfileResponse | null;
}

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'parent' | 'school-admin';
}

export async function loginUser(email: string, password: string) {
  const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  return response.data;
}

export async function registerUser(payload: RegisterPayload) {
  const response = await apiClient.post<LoginResponse>('/auth/register', payload);
  return response.data;
}

/**
 * Get current authenticated user info
 */
export async function getMe() {
  const response = await apiClient.get<{ user: AuthUser }>('/auth/me');
  return response.data.user;
}

/**
 * Get admin user info + their linked school
 * Admin-only endpoint
 */
export async function getAdminInfo() {
  const response = await apiClient.get<AdminInfo>('/auth/admin-info');
  return response.data;
}

/**
 * Logout the current user
 */
export async function logout() {
  const response = await apiClient.post('/auth/logout');
  return response.data;
}
