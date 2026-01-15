/**
 * Drivers Repository
 * Data access layer for drivers - handles all API calls
 */

import type {
  ApiDriver,
  CreateDriverRequest,
  GetDriversResponse,
  UpdateDriverRequest,
} from "./drivers.types";

// API base URL Configuration
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

/**
 * Make API request with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    let data;
    try {
      data = await response.json();
    } catch {
      // If response is not JSON, get text
      const text = await response.text();
      throw new Error(
        `API returned non-JSON: ${text} (Status: ${response.status})`
      );
    }

    if (!response.ok) {
      const errorMessage =
        data?.error || data?.message || `HTTP ${response.status}`;
      const fullError = new Error(errorMessage);
      (fullError as any).status = response.status;
      (fullError as any).data = data;
      (fullError as any).endpoint = endpoint;
      throw fullError;
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        `Cannot connect to backend at ${API_BASE_URL}. Is the server running?`
      );
    }
    throw error;
  }
}

/**
 * Drivers Repository - handles all data access operations
 */
export class DriversRepository {
  /**
   * Fetch all drivers, optionally filtered by active status
   */
  async findAll(options?: {
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<GetDriversResponse> {
    const params = new URLSearchParams();
    if (options?.is_active !== undefined) {
      params.append("is_active", String(options.is_active));
    }
    if (options?.limit) params.append("limit", String(options.limit));
    if (options?.offset) params.append("offset", String(options.offset));

    const query = params.toString();
    return apiRequest<GetDriversResponse>(
      `/api/drivers${query ? `?${query}` : ""}`
    );
  }

  /**
   * Fetch a single driver by ID (backend UUID)
   */
  async findById(driverId: string): Promise<ApiDriver> {
    return apiRequest<ApiDriver>(`/api/drivers/${driverId}`);
  }

  /**
   * Create a new driver
   */
  async create(driver: CreateDriverRequest): Promise<ApiDriver> {
    return apiRequest<ApiDriver>("/api/drivers", {
      method: "POST",
      body: JSON.stringify(driver),
    });
  }

  /**
   * Update a driver
   */
  async update(
    driverId: string,
    updates: UpdateDriverRequest
  ): Promise<ApiDriver> {
    return apiRequest<ApiDriver>(`/api/drivers/${driverId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a driver
   */
  async delete(driverId: string): Promise<{ success: boolean; id: string }> {
    return apiRequest(`/api/drivers/${driverId}`, {
      method: "DELETE",
    });
  }
}

