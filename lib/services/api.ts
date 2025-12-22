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
  orders: {
    orderId: string;
    orderNumber: string;
    rank: number;
    distanceFromPrev: number;
  }[];
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
 * Fetch a single order by ID
 * @param orderId Order UUID from backend
 */
export async function fetchOrder(orderId: string): Promise<Order> {
  return apiRequest<Order>(`/api/orders/${orderId}`);
}

/**
 * Create orders (bulk from CSV)
 * @param orders Array of orders to create
 */
export async function createOrders(orders: CreateOrderRequest[]): Promise<{
  success: boolean;
  created: number;
  failed: number;
  orders: Order[];
  errors?: { order: string; error: string }[];
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
 * Bulk assign driver to multiple orders
 * @param orderIds Array of order UUIDs to assign driver to
 * @param driverId Backend driver UUID
 */
export async function bulkAssignDriver(
  orderIds: string[],
  driverId: string
): Promise<{
  success: boolean;
  updated: number;
  orderIds: string[];
}> {
  return apiRequest("/api/orders/bulk-assign-driver", {
    method: "PUT",
    body: JSON.stringify({ orderIds, driverId }),
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

/**
 * Zone-related API functions
 */

export interface Zone {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  radius?: number | null;
  orders: Order[];
  orderCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateZoneInput {
  name: string;
  center: { lat: number; lng: number };
  radius?: number;
  orderIds: string[];
}

/**
 * Get all zones with their orders
 */
export async function fetchZones(): Promise<{ zones: Zone[] }> {
  return apiRequest("/api/zones");
}

/**
 * Create zones from clustering
 * @param zones Array of zone data with order IDs
 */
export async function createZones(zones: CreateZoneInput[]): Promise<{
  success: boolean;
  created: number;
  zones: Zone[];
}> {
  return apiRequest("/api/zones", {
    method: "POST",
    body: JSON.stringify({ zones }),
  });
}

/**
 * Assign driver to all orders in a zone
 * @param zoneId Zone UUID
 * @param driverId Backend driver UUID
 */
export async function assignDriverToZone(
  zoneId: string,
  driverId: string
): Promise<{
  success: boolean;
  zoneId: string;
  driverId: string;
  updated: number;
  orderIds: string[];
}> {
  return apiRequest(`/api/zones/${zoneId}/assign-driver`, {
    method: "PUT",
    body: JSON.stringify({ driverId }),
  });
}
