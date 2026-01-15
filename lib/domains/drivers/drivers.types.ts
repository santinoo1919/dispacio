/**
 * Drivers Domain Types
 * Domain model for drivers
 */

export interface Driver {
  id: string; // Backend UUID (no more frontend ID mapping)
  name: string;
  phone: string;
  email?: string | null;
  initials?: string | null;
  color?: string | null;
  location?: {
    lat: number;
    lng: number;
  } | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

/**
 * Backend API driver format (snake_case)
 */
export interface ApiDriver {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  initials?: string | null;
  color?: string | null;
  location?: { lat: number; lng: number } | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

/**
 * Request format for creating drivers
 */
export interface CreateDriverRequest {
  name: string;
  phone: string;
  email?: string;
  initials?: string;
  color?: string;
  location?: { lat: number; lng: number };
  is_active?: boolean;
}

/**
 * Request format for updating drivers
 */
export interface UpdateDriverRequest {
  name?: string;
  phone?: string;
  email?: string;
  initials?: string;
  color?: string;
  location?: { lat: number; lng: number };
  is_active?: boolean;
}

/**
 * Response from fetching drivers
 */
export interface GetDriversResponse {
  drivers: ApiDriver[];
  total: number;
  limit: number;
  offset: number;
}

