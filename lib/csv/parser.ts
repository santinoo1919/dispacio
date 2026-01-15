/**
 * CSV Parser - Flexible parsing for any CSV format
 * Uses PapaParse to handle various CSV formats and auto-detect columns
 */

import Papa from "papaparse";
import { CSVParseResult, Order } from "../types";

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
          error: `CSV parsing errors: ${parsed.errors
            .map((e) => e.message)
            .join(", ")}`,
          headers: [],
        };
      }

      const headers = parsed.meta.fields || [];

      if (headers.length === 0) {
        return {
          success: false,
          orders: [],
          error: "No headers found in CSV file",
          headers: [],
        };
      }

      const orders: Order[] = parsed.data
        .map((row: any, index: number) => {
          // Auto-detect key columns by common names
          const orderId = this.findColumn(row, [
            "id",
            "order_id",
            "orderid",
            "order number",
            "order_number",
          ]);
          const customerName = this.findColumn(row, [
            "customer",
            "name",
            "customer_name",
            "client",
            "customer_name",
          ]);
          const address = this.findColumn(row, [
            "address",
            "delivery_address",
            "location",
            "full_address",
            "delivery_location",
          ]);
          const phone = this.findColumn(row, [
            "phone",
            "mobile",
            "telephone",
            "contact",
            "phone_number",
          ]);
          const notes = this.findColumn(row, [
            "notes",
            "note",
            "comments",
            "special_instructions",
          ]);
          const amount = this.findColumn(row, [
            "amount",
            "total",
            "order_total",
            "price",
            "value",
          ]);
          const items = this.findColumn(row, [
            "items",
            "products",
            "order_items",
            "product_list",
          ]);

          // Extract coordinates if available in CSV
          const lat = this.findColumn(row, [
            "latitude",
            "lat",
            "coord_lat",
            "y",
          ]);
          const lng = this.findColumn(row, [
            "longitude",
            "lng",
            "lon",
            "long",
            "coord_lng",
            "x",
          ]);

          // Extract package dimensions (for VROOM capacity constraints)
          const packageLength = this.findColumn(row, [
            "package_length",
            "length",
            "pkg_length",
            "l",
            "L",
          ]);
          const packageWidth = this.findColumn(row, [
            "package_width",
            "width",
            "pkg_width",
            "w",
            "W",
          ]);
          const packageHeight = this.findColumn(row, [
            "package_height",
            "height",
            "pkg_height",
            "h",
            "H",
          ]);
          const packageWeight = this.findColumn(row, [
            "package_weight",
            "weight",
            "pkg_weight",
            "kg",
            "weight_kg",
          ]);

          // Parse numeric values
          const length = packageLength
            ? parseFloat(packageLength.replace(/[^0-9.-]/g, ""))
            : undefined;
          const width = packageWidth
            ? parseFloat(packageWidth.replace(/[^0-9.-]/g, ""))
            : undefined;
          const height = packageHeight
            ? parseFloat(packageHeight.replace(/[^0-9.-]/g, ""))
            : undefined;
          const weight = packageWeight
            ? parseFloat(packageWeight.replace(/[^0-9.-]/g, ""))
            : undefined;

          // Calculate volume if all dimensions are available
          let packageVolume: number | undefined = undefined;
          if (length && width && height) {
            packageVolume = length * width * height;
          }

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
            amount: amount
              ? parseFloat(amount.replace(/[^0-9.-]/g, ""))
              : undefined,
            items: items || undefined,
            latitude: lat ? parseFloat(lat) : undefined,
            longitude: lng ? parseFloat(lng) : undefined,
            packageLength: length,
            packageWidth: width,
            packageHeight: height,
            packageWeight: weight,
            packageVolume: packageVolume,
            priority: "normal" as const,
            // Don't set rank for new CSV orders - rank is only set after route optimization
            rawData: row, // Store all original data
          };
        })
        .filter((order) => order !== null) as Order[];

      // Don't set ranks for new CSV orders - rank is only set after route optimization
      return {
        success: true,
        orders: orders,
        headers,
      };
    } catch (error) {
      return {
        success: false,
        orders: [],
        error: error instanceof Error ? error.message : "Unknown parsing error",
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
    return orders
      .map(
        (order, idx) =>
          `${idx + 1}. ${order.id} - ${order.customerName}\n   ${order.address}`
      )
      .join("\n\n");
  }
}
