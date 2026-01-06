/**
 * API Client Service
 * HTTP client for calling Fastify backend endpoints
 */

// API base URL Configuration
// 
// Set via environment variable EXPO_PUBLIC_API_URL:
// - Local dev (simulator):  http://localhost:3000
// - Local dev (device):     http://<your-computer-ip>:3000
// - Production:             https://dispacio-production.up.railway.app
//
// Create .env.local for local overrides (gitignored)
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
  version?: number; // Optimistic locking
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
  version?: number; // For optimistic locking on updates
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

export interface ConflictError extends ApiError {
  currentVersion: number;
}

/**
 * Check if error is a version conflict (409)
 */
export function isConflictError(error: unknown): error is Error & { status: 409; data: ConflictError } {
  return (
    error instanceof Error &&
    (error as any).status === 409 &&
    (error as any).data?.error === "Conflict"
  );
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

/**
 * Driver-related API functions
 */

export interface ApiDriver {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  initials?: string | null;
  color?: string | null;
  location?: { lat: number; lng: number } | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface CreateDriverRequest {
  name: string;
  phone: string;
  email?: string;
  initials?: string;
  color?: string;
  location?: { lat: number; lng: number };
  is_active?: boolean;
}

export interface UpdateDriverRequest {
  name?: string;
  phone?: string;
  email?: string;
  initials?: string;
  color?: string;
  location?: { lat: number; lng: number };
  is_active?: boolean;
}

export interface GetDriversResponse {
  drivers: ApiDriver[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Get all drivers
 * @param is_active Optional filter for active drivers only
 * @param limit Pagination limit
 * @param offset Pagination offset
 */
export async function fetchDrivers(
  options?: {
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<GetDriversResponse> {
  const params = new URLSearchParams();
  if (options?.is_active !== undefined) {
    params.append("is_active", String(options.is_active));
  }
  if (options?.limit) params.append("limit", String(options.limit));
  if (options?.offset) params.append("offset", String(options.offset));

  const query = params.toString();
  return apiRequest(`/api/drivers${query ? `?${query}` : ""}`);
}

/**
 * Get a single driver by ID
 * @param driverId Driver UUID
 */
export async function fetchDriver(driverId: string): Promise<ApiDriver> {
  return apiRequest(`/api/drivers/${driverId}`);
}

/**
 * Create a new driver
 * @param driver Driver data
 */
export async function createDriver(
  driver: CreateDriverRequest
): Promise<ApiDriver> {
  return apiRequest("/api/drivers", {
    method: "POST",
    body: JSON.stringify(driver),
  });
}

/**
 * Update a driver
 * @param driverId Driver UUID
 * @param updates Partial driver data to update
 */
export async function updateDriver(
  driverId: string,
  updates: UpdateDriverRequest
): Promise<ApiDriver> {
  return apiRequest(`/api/drivers/${driverId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a driver
 * @param driverId Driver UUID
 */
export async function deleteDriver(
  driverId: string
): Promise<{ success: boolean; id: string }> {
  return apiRequest(`/api/drivers/${driverId}`, {
    method: "DELETE",
  });
}
