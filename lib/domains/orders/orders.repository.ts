/**
 * Orders Repository
 * Data access layer for orders - handles all API calls
 */

import type {
  ApiOrder,
  CreateOrderRequest,
  CreateOrdersResponse,
} from "./orders.types";
import { apiRequest } from "@/lib/services/api";
import { validateResponse } from "@/lib/services/api.validation";
import {
  GetOrdersResponseSchema,
  CreateOrdersResponseSchema,
  UpdateOrderResponseSchema,
  DeleteOrderResponseSchema,
  BulkAssignDriverResponseSchema,
} from "./orders.schemas";

/**
 * Orders Repository - handles all data access operations
 */
export class OrdersRepository {
  /**
   * Fetch all orders, optionally filtered by driver ID (backend UUID)
   */
  async findAll(backendDriverId?: string): Promise<ApiOrder[]> {
    const endpoint = backendDriverId
      ? `/api/orders?driver_id=${backendDriverId}`
      : "/api/orders";
    const response = await apiRequest<unknown>(endpoint);
    const validated = validateResponse(
      response,
      GetOrdersResponseSchema,
      endpoint
    );
    return validated.orders;
  }

  /**
   * Fetch a single order by ID (backend UUID)
   */
  async findById(orderId: string): Promise<ApiOrder> {
    const endpoint = `/api/orders/${orderId}`;
    const response = await apiRequest<unknown>(endpoint);
    return validateResponse(response, UpdateOrderResponseSchema, endpoint);
  }

  /**
   * Create orders (bulk from CSV)
   */
  async create(
    orders: CreateOrderRequest[]
  ): Promise<CreateOrdersResponse> {
    const endpoint = "/api/orders";
    const response = await apiRequest<unknown>(endpoint, {
      method: "POST",
      data: { orders },
    });
    return validateResponse(
      response,
      CreateOrdersResponseSchema,
      endpoint
    );
  }

  /**
   * Update an order
   */
  async update(
    orderId: string,
    updates: Partial<CreateOrderRequest>
  ): Promise<ApiOrder> {
    const endpoint = `/api/orders/${orderId}`;
    const response = await apiRequest<unknown>(endpoint, {
      method: "PUT",
      data: updates,
    });
    return validateResponse(response, UpdateOrderResponseSchema, endpoint);
  }

  /**
   * Bulk assign driver to multiple orders
   * @param orderIds Array of order UUIDs (backend)
   * @param backendDriverId Backend driver UUID
   */
  async bulkAssignDriver(
    orderIds: string[],
    backendDriverId: string
  ): Promise<{
    success: boolean;
    updated: number;
    orderIds: string[];
  }> {
    const endpoint = "/api/orders/bulk-assign-driver";
    const response = await apiRequest<unknown>(endpoint, {
      method: "PUT",
      data: { orderIds, driverId: backendDriverId },
    });
    return validateResponse(
      response,
      BulkAssignDriverResponseSchema,
      endpoint
    );
  }

  /**
   * Delete an order
   */
  async delete(orderId: string): Promise<{ success: boolean; id: string }> {
    const endpoint = `/api/orders/${orderId}`;
    const response = await apiRequest<unknown>(endpoint, {
      method: "DELETE",
    });
    return validateResponse(response, DeleteOrderResponseSchema, endpoint);
  }
}

