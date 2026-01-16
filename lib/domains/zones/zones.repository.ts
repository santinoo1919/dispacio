/**
 * Zones Repository
 * Data access layer for zones - handles all API calls
 */

import type {
  ApiZone,
  CreateZoneRequest,
  GetZonesResponse,
  CreateZonesResponse,
  AssignDriverToZoneResponse,
} from "./zones.types";
import { apiRequest } from "@/lib/services/api";
import { validateResponse } from "@/lib/services/api.validation";
import {
  GetZonesResponseSchema,
  CreateZonesResponseSchema,
  AssignDriverToZoneResponseSchema,
} from "./zones.schemas";

/**
 * Zones Repository - handles all data access operations
 */
export class ZonesRepository {
  /**
   * Fetch all zones
   */
  async findAll(): Promise<GetZonesResponse> {
    const endpoint = "/api/zones";
    const response = await apiRequest<unknown>(endpoint);
    return validateResponse(response, GetZonesResponseSchema, endpoint);
  }

  /**
   * Create zones
   */
  async create(zones: CreateZoneRequest[]): Promise<CreateZonesResponse> {
    const endpoint = "/api/zones";
    const response = await apiRequest<unknown>(endpoint, {
      method: "POST",
      data: { zones },
    });
    return validateResponse(response, CreateZonesResponseSchema, endpoint);
  }

  /**
   * Assign driver to all orders in a zone
   */
  async assignDriver(
    zoneId: string,
    driverId: string
  ): Promise<AssignDriverToZoneResponse> {
    const endpoint = `/api/zones/${zoneId}/assign-driver`;
    const response = await apiRequest<unknown>(endpoint, {
      method: "PUT",
      data: { driverId },
    });
    return validateResponse(
      response,
      AssignDriverToZoneResponseSchema,
      endpoint
    );
  }
}

