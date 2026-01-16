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
import { apiRequest } from "@/lib/services/api";

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
      data: driver, // Axios uses 'data' and auto-serializes JSON
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
      data: updates, // Axios uses 'data' and auto-serializes JSON
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

