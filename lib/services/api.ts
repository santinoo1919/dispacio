/**
 * API Client Service
 * HTTP client for calling Fastify backend endpoints
 */

// API base URL - set EXPO_PUBLIC_API_URL in .env or use default
// For local development: http://localhost:3000
// For physical device: http://<your-computer-ip>:3000
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export interface Order {
  id: string;
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
  created_at?: string;
  updated_at?: string;
  raw_data?: any;
}

export interface CreateOrderRequest {
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
}

export interface OptimizeRouteResponse {
  success: boolean;
  driverId: string;
  totalDistance: number;
  totalDuration: number;
  orders: Array<{
    orderId: string;
    orderNumber: string;
    rank: number;
    distanceFromPrev: number;
  }>;
}

export interface ApiError {
  error: string;
  message?: string;
}

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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
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
 * Fetch orders from API
 * @param driverId Optional driver ID to filter orders
 */
export async function fetchOrders(driverId?: string): Promise<Order[]> {
  const endpoint = driverId
    ? `/api/orders?driver_id=${driverId}`
    : "/api/orders";
  const response = await apiRequest<{ orders: Order[] }>(endpoint);
  return response.orders;
}

/**
 * Create orders (bulk from CSV)
 * @param orders Array of orders to create
 */
export async function createOrders(
  orders: CreateOrderRequest[]
): Promise<{
  success: boolean;
  created: number;
  failed: number;
  orders: Order[];
  errors?: Array<{ order: string; error: string }>;
}> {
  return apiRequest("/api/orders", {
    method: "POST",
    body: JSON.stringify({ orders }),
  });
}

/**
 * Update order
 * @param orderId Order ID to update
 * @param updates Partial order data to update
 */
export async function updateOrder(
  orderId: string,
  updates: Partial<CreateOrderRequest>
): Promise<Order> {
  return apiRequest(`/api/orders/${orderId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

/**
 * Delete order
 * @param orderId Order ID to delete
 */
export async function deleteOrder(
  orderId: string
): Promise<{ success: boolean; id: string }> {
  return apiRequest(`/api/orders/${orderId}`, {
    method: "DELETE",
  });
}

/**
 * Optimize route for a driver using VROOM
 * @param driverId Driver ID
 * @param orderIds Optional array of specific order IDs to optimize
 */
export async function optimizeRoute(
  driverId: string,
  orderIds?: string[]
): Promise<OptimizeRouteResponse> {
  return apiRequest("/api/routes/optimize", {
    method: "POST",
    body: JSON.stringify({ driverId, orderIds }),
  });
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{
  status: string;
  database: string;
  timestamp?: string;
}> {
  return apiRequest("/health");
}
