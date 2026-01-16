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
    const response = await apiRequest<{ orders: ApiOrder[] }>(endpoint);
    return response.orders;
  }

  /**
   * Fetch a single order by ID (backend UUID)
   */
  async findById(orderId: string): Promise<ApiOrder> {
    return apiRequest<ApiOrder>(`/api/orders/${orderId}`);
  }

  /**
   * Create orders (bulk from CSV)
   */
  async create(
    orders: CreateOrderRequest[]
  ): Promise<CreateOrdersResponse> {
    return apiRequest<CreateOrdersResponse>("/api/orders", {
      method: "POST",
      body: JSON.stringify({ orders }),
    });
  }

  /**
   * Update an order
   */
  async update(
    orderId: string,
    updates: Partial<CreateOrderRequest>
  ): Promise<ApiOrder> {
    return apiRequest<ApiOrder>(`/api/orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
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
    return apiRequest("/api/orders/bulk-assign-driver", {
      method: "PUT",
      body: JSON.stringify({ orderIds, driverId: backendDriverId }),
    });
  }

  /**
   * Delete an order
   */
  async delete(orderId: string): Promise<{ success: boolean; id: string }> {
    return apiRequest(`/api/orders/${orderId}`, {
      method: "DELETE",
    });
  }
}

