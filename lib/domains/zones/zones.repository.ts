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
      body: JSON.stringify({ zones }),
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
        body: JSON.stringify({ driverId }),
      }
    );
  }
}

