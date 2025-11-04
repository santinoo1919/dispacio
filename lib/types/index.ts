/**
 * Core data types for the dispatch app
 */

export interface Order {
  id: string;
  customerName: string;
  address: string;
  phone?: string;
  notes?: string;
  amount?: number;
  items?: string;
  priority?: "low" | "normal" | "high";
  rank: number; // Order position in dispatch sequence
  driverId?: string; // Driver assigned to this order
  rawData: Record<string, any>; // Store all original CSV data for flexibility
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  initials: string;
}

export interface Dispatch {
  id: string;
  driverName: string;
  driverPhone: string;
  orders: Order[];
  createdAt: Date;
}

export interface CSVParseResult {
  success: boolean;
  orders: Order[];
  error?: string;
  headers: string[];
}
