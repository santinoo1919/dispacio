/**
 * Orders Repository
 * Data access layer for orders - handles all API calls
 */

import type {
  ApiOrder,
  CreateOrderRequest,
  CreateOrdersResponse,
} from "./orders.types";

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

