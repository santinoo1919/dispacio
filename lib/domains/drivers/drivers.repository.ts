/**
 * Drivers Repository
 * Data access layer for drivers - handles all API calls
 */

import { apiRequest } from "@/lib/services/api";
import { validateResponse } from "@/lib/services/api.validation";
import {
  CreateDriverResponseSchema,
  DeleteDriverResponseSchema,
  GetDriversResponseSchema,
  UpdateDriverResponseSchema,
} from "./drivers.schemas";
import type {
  ApiDriver,
  CreateDriverRequest,
  GetDriversResponse,
  UpdateDriverRequest,
} from "./drivers.types";

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
    const endpoint = `/api/drivers${query ? `?${query}` : ""}`;
    const response = await apiRequest<unknown>(endpoint);
    return validateResponse(response, GetDriversResponseSchema, endpoint);
  }

  /**
   * Fetch a single driver by ID (backend UUID)
   */
  async findById(driverId: string): Promise<ApiDriver> {
    const endpoint = `/api/drivers/${driverId}`;
    const response = await apiRequest<unknown>(endpoint);
    return validateResponse(response, UpdateDriverResponseSchema, endpoint);
  }

  /**
   * Create a new driver
   */
  async create(driver: CreateDriverRequest): Promise<ApiDriver> {
    const endpoint = "/api/drivers";
    const response = await apiRequest<unknown>(endpoint, {
      method: "POST",
      data: driver,
    });
    return validateResponse(response, CreateDriverResponseSchema, endpoint);
  }

  /**
   * Update a driver
   */
  async update(
    driverId: string,
    updates: UpdateDriverRequest
  ): Promise<ApiDriver> {
    const endpoint = `/api/drivers/${driverId}`;
    const response = await apiRequest<unknown>(endpoint, {
      method: "PUT",
      data: updates,
    });
    return validateResponse(response, UpdateDriverResponseSchema, endpoint);
  }

  /**
   * Delete a driver
   */
  async delete(driverId: string): Promise<{ success: boolean; id: string }> {
    const endpoint = `/api/drivers/${driverId}`;
    const response = await apiRequest<unknown>(endpoint, {
      method: "DELETE",
    });
    return validateResponse(response, DeleteDriverResponseSchema, endpoint);
  }
}
