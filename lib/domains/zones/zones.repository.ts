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

/**
 * Zones Repository - handles all data access operations
 */
export class ZonesRepository {
  /**
   * Fetch all zones
   */
  async findAll(): Promise<GetZonesResponse> {
    return apiRequest<GetZonesResponse>("/api/zones");
  }

  /**
   * Create zones
   */
  async create(zones: CreateZoneRequest[]): Promise<CreateZonesResponse> {
    // Backend schema expects: { name, center: { lat, lng }, radius?, orderIds }
    // CreateZoneRequest already matches this format, no transformation needed
    return apiRequest<CreateZonesResponse>("/api/zones", {
      method: "POST",
      data: { zones }, // Axios uses 'data' and auto-serializes JSON
    });
  }

  /**
   * Assign driver to all orders in a zone
   */
  async assignDriver(
    zoneId: string,
    driverId: string
  ): Promise<AssignDriverToZoneResponse> {
    return apiRequest<AssignDriverToZoneResponse>(
      `/api/zones/${zoneId}/assign-driver`,
      {
        method: "PUT",
        data: { driverId }, // Axios uses 'data' and auto-serializes JSON
      }
    );
  }
}

