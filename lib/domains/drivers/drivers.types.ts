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
 * @internal This type is for internal use by repository and transformer only.
 * Components should use the Driver domain type instead.
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
 * name and phone are required at compile time
 */
export interface CreateDriverRequest {
  name: string; // Required
  phone: string; // Required
  email?: string;
  initials?: string;
  color?: string;
  location?: { lat: number; lng: number };
  is_active?: boolean;
}

/**
 * Type helper to ensure required fields are present
 * This makes TypeScript enforce required fields at compile time
 */
export type CreateDriverRequestStrict = Required<
  Pick<CreateDriverRequest, "name" | "phone">
> &
  Omit<CreateDriverRequest, "name" | "phone">;

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

