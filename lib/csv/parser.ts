/**
 * CSV Parser - Flexible parsing for any CSV format
 * Uses PapaParse to handle various CSV formats and auto-detect columns
 */

import Papa from 'papaparse';
import { CSVParseResult, Order } from '../types';

/**
 * Flexible CSV parser that auto-detects column headers
 * and creates Orders from any CSV format
 */
export class CSVParser {
  /**
   * Parse CSV text and convert to Order array
   */
  static parse(csvText: string): CSVParseResult {
    try {
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
      });

      if (parsed.errors.length > 0) {
        return {
          success: false,
          orders: [],
          error: `CSV parsing errors: ${parsed.errors.map(e => e.message).join(', ')}`,
          headers: [],
        };
      }

      const headers = parsed.meta.fields || [];
      
      if (headers.length === 0) {
        return {
          success: false,
          orders: [],
          error: 'No headers found in CSV file',
          headers: [],
        };
      }

      const orders: Order[] = parsed.data.map((row: any, index: number) => {
        // Auto-detect key columns by common names
        const orderId = this.findColumn(row, ['id', 'order_id', 'orderid', 'order number', 'order_number']);
        const customerName = this.findColumn(row, ['customer', 'name', 'customer_name', 'client', 'customer_name']);
        const address = this.findColumn(row, ['address', 'delivery_address', 'location', 'full_address', 'delivery_location']);
        const phone = this.findColumn(row, ['phone', 'mobile', 'telephone', 'contact', 'phone_number']);
        const notes = this.findColumn(row, ['notes', 'note', 'comments', 'special_instructions']);
        const amount = this.findColumn(row, ['amount', 'total', 'order_total', 'price', 'value']);
        const items = this.findColumn(row, ['items', 'products', 'order_items', 'product_list']);

        // Validate required fields
        if (!orderId || !customerName || !address) {
          return null; // Will filter out invalid orders
        }

        return {
          id: orderId,
          customerName: customerName,
          address: address,
          phone: phone || undefined,
          notes: notes || undefined,
          amount: amount ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : undefined,
          items: items || undefined,
          priority: 'normal' as const,
          rank: 0, // Will be updated after filtering
          rawData: row, // Store all original data
        };
      }).filter(order => order !== null) as Order[];

      // Set ranks after filtering out invalid orders
      const rankedOrders = orders.map((order, index) => ({
        ...order,
        rank: index + 1,
      }));

      return {
        success: true,
        orders: rankedOrders,
        headers,
      };
    } catch (error) {
      return {
        success: false,
        orders: [],
        error: error instanceof Error ? error.message : 'Unknown parsing error',
        headers: [],
      };
    }
  }

  /**
   * Helper: Find value in row by trying multiple possible column names
   */
  private static findColumn(row: any, possibleNames: string[]): string | null {
    for (const name of possibleNames) {
      if (row[name]) {
        return String(row[name]).trim();
      }
    }
    return null;
  }

  /**
   * Format orders for display/debugging
   */
  static formatOrdersPreview(orders: Order[]): string {
    return orders.map((order, idx) => 
      `${idx + 1}. ${order.id} - ${order.customerName}\n   ${order.address}`
    ).join('\n\n');
  }
}

