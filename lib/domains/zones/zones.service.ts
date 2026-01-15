/**
 * Zones Service
 * Business logic layer for zones domain
 */

import type {
  Zone,
  CreateZoneRequest,
  AssignDriverToZoneResponse,
} from "./zones.types";
import { ZonesRepository } from "./zones.repository";
import { toDomain, toDomainMany } from "./zones.transformer";
import type { Order } from "../orders/orders.types";
import type { Driver } from "../drivers/drivers.types";

/**
 * Zones Service - handles all business logic
 */
export class ZonesService {
  constructor(private repository: ZonesRepository) {}

  /**
   * Get all zones with their orders
   * Filters out empty zones (zones with no orders)
   */
  async getZones(
    orders: Order[] = [],
    drivers: Driver[] = []
  ): Promise<Zone[]> {
    const response = await this.repository.findAll();
    const allZones = toDomainMany(response.zones, orders, drivers);
    // Filter out empty zones (zones with no orders)
    return allZones.filter((zone) => zone.orders.length > 0);
  }

  /**
   * Create zones from clustering
   */
  async createZones(zones: CreateZoneRequest[]): Promise<Zone[]> {
    const response = await this.repository.create(zones);
    // Transform created zones back to domain
    // Note: Created zones won't have orders populated yet, need to fetch separately
    return toDomainMany(response.zones, [], []);
  }

  /**
   * Assign driver to all orders in a zone
   */
  async assignDriverToZone(
    zoneId: string,
    driverId: string
  ): Promise<AssignDriverToZoneResponse> {
    return this.repository.assignDriver(zoneId, driverId);
  }
}

/**
 * Create a singleton instance of ZonesService
 * This will be replaced with dependency injection later
 */
let zonesServiceInstance: ZonesService | null = null;

export function getZonesService(): ZonesService {
  if (!zonesServiceInstance) {
    zonesServiceInstance = new ZonesService(new ZonesRepository());
  }
  return zonesServiceInstance;
}

