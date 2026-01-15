/**
 * Orders Service
 * Business logic layer for orders domain
 */

import { getBackendDriverId } from "@/lib/data/drivers";
import type { Order } from "./orders.types";
import { OrdersRepository } from "./orders.repository";
import { toDomain, toDomainMany, toApi } from "./orders.transformer";

/**
 * Orders Service - handles all business logic
 */
export class OrdersService {
  constructor(private repository: OrdersRepository) {}

  /**
   * Get all orders, optionally filtered by driver (frontend ID)
   * Handles driver ID conversion (frontend ID → backend UUID)
   */
  async getOrders(frontendDriverId?: string): Promise<Order[]> {
    // Convert frontend driver ID to backend UUID if filtering
    let backendDriverId: string | undefined;
    if (frontendDriverId) {
      backendDriverId = getBackendDriverId(frontendDriverId) || undefined;
    }

    // Fetch from repository
    const apiOrders = await this.repository.findAll(backendDriverId);

    // Transform to domain model
    return toDomainMany(apiOrders);
  }

  /**
   * Get a single order by ID (backend UUID)
   */
  async getOrder(orderId: string): Promise<Order> {
    const apiOrder = await this.repository.findById(orderId);
    return toDomain(apiOrder);
  }

  /**
   * Create orders from domain models
   * Converts domain orders to API format before sending
   */
  async createOrders(orders: Order[]): Promise<{
    success: boolean;
    created: number;
    failed: number;
    orders: Order[];
    errors?: { order: string; error: string }[];
  }> {
    // Convert domain orders to API format
    const apiOrders = orders.map((order) =>
      toApi(order, getBackendDriverId)
    );

    // Create via repository
    const result = await this.repository.create(apiOrders);

    // Transform created orders back to domain
    return {
      ...result,
      orders: toDomainMany(result.orders),
    };
  }

  /**
   * Update an order
   * Converts domain updates to API format
   */
  async updateOrder(
    orderId: string,
    updates: Partial<Order>
  ): Promise<Order> {
    // Convert domain updates to API format
    const apiUpdates: Partial<{
      order_number: string;
      customer_name: string;
      address: string;
      phone?: string;
      notes?: string;
      amount?: number;
      items?: string;
      priority?: string;
      package_length?: number;
      package_width?: number;
      package_height?: number;
      package_weight?: number;
      package_volume?: number;
      latitude?: number;
      longitude?: number;
      driver_id?: string;
      route_rank?: number;
      rawData?: Record<string, any>;
    }> = {};

    if (updates.id !== undefined) apiUpdates.order_number = updates.id;
    if (updates.customerName !== undefined)
      apiUpdates.customer_name = updates.customerName;
    if (updates.address !== undefined) apiUpdates.address = updates.address;
    if (updates.phone !== undefined) apiUpdates.phone = updates.phone;
    if (updates.notes !== undefined) apiUpdates.notes = updates.notes;
    if (updates.amount !== undefined) apiUpdates.amount = updates.amount;
    if (updates.items !== undefined) apiUpdates.items = updates.items;
    if (updates.priority !== undefined) apiUpdates.priority = updates.priority;
    if (updates.packageLength !== undefined)
      apiUpdates.package_length = updates.packageLength;
    if (updates.packageWidth !== undefined)
      apiUpdates.package_width = updates.packageWidth;
    if (updates.packageHeight !== undefined)
      apiUpdates.package_height = updates.packageHeight;
    if (updates.packageWeight !== undefined)
      apiUpdates.package_weight = updates.packageWeight;
    if (updates.packageVolume !== undefined)
      apiUpdates.package_volume = updates.packageVolume;
    if (updates.latitude !== undefined) apiUpdates.latitude = updates.latitude;
    if (updates.longitude !== undefined)
      apiUpdates.longitude = updates.longitude;
    if (updates.driverId !== undefined) {
      apiUpdates.driver_id = getBackendDriverId(updates.driverId) || undefined;
    }
    if (updates.rank !== undefined) apiUpdates.route_rank = updates.rank;
    if (updates.rawData !== undefined) apiUpdates.rawData = updates.rawData;

    // Update via repository
    const apiOrder = await this.repository.update(orderId, apiUpdates);

    // Transform back to domain
    return toDomain(apiOrder);
  }

  /**
   * Assign driver to multiple orders
   * Handles driver ID conversion (frontend ID → backend UUID)
   */
  async assignDriverToOrders(
    orderIds: string[],
    frontendDriverId: string
  ): Promise<void> {
    const backendDriverId = getBackendDriverId(frontendDriverId);
    if (!backendDriverId) {
      throw new Error(
        `No backend driver ID found for ${frontendDriverId}`
      );
    }

    await this.repository.bulkAssignDriver(orderIds, backendDriverId);
  }

  /**
   * Delete an order
   */
  async deleteOrder(orderId: string): Promise<void> {
    await this.repository.delete(orderId);
  }
}

/**
 * Create a singleton instance of OrdersService
 * This will be replaced with dependency injection later
 */
let ordersServiceInstance: OrdersService | null = null;

export function getOrdersService(): OrdersService {
  if (!ordersServiceInstance) {
    ordersServiceInstance = new OrdersService(new OrdersRepository());
  }
  return ordersServiceInstance;
}

