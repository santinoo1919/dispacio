import { CSVParser } from '../parser';
import { Order } from '@/lib/types';

describe('CSVParser', () => {
  describe('parse', () => {
    it('should parse valid CSV with standard column names', () => {
      const csv = `id,customer,address,phone,amount
ORD-001,John Doe,123 Main St,555-0100,25.50
ORD-002,Jane Smith,456 Oak Ave,555-0200,30.00`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(2);
      expect(result.orders[0].id).toBe('ORD-001');
      expect(result.orders[0].customerName).toBe('John Doe');
      expect(result.orders[0].address).toBe('123 Main St');
      expect(result.orders[0].phone).toBe('555-0100');
      expect(result.orders[0].amount).toBe(25.5);
      expect(result.headers).toContain('id');
      expect(result.headers).toContain('customer');
    });

    it('should auto-detect alternative column names', () => {
      const csv = `order_id,customer_name,delivery_address,mobile,total
ORD-001,John Doe,123 Main St,555-0100,25.50`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].id).toBe('ORD-001');
      expect(result.orders[0].customerName).toBe('John Doe');
      expect(result.orders[0].address).toBe('123 Main St');
      expect(result.orders[0].phone).toBe('555-0100');
      expect(result.orders[0].amount).toBe(25.5);
    });

    it('should parse coordinates when available', () => {
      const csv = `id,customer,address,latitude,longitude
ORD-001,John Doe,123 Main St,40.7128,-74.0060
ORD-002,Jane Smith,456 Oak Ave,34.0522,-118.2437`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(2);
      expect(result.orders[0].latitude).toBe(40.7128);
      expect(result.orders[0].longitude).toBe(-74.0060);
      expect(result.orders[1].latitude).toBe(34.0522);
      expect(result.orders[1].longitude).toBe(-118.2437);
    });

    it('should parse package dimensions', () => {
      const csv = `id,customer,address,length,width,height,weight
ORD-001,John Doe,123 Main St,10,5,3,2.5`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].packageLength).toBe(10);
      expect(result.orders[0].packageWidth).toBe(5);
      expect(result.orders[0].packageHeight).toBe(3);
      expect(result.orders[0].packageWeight).toBe(2.5);
      expect(result.orders[0].packageVolume).toBe(150); // 10 * 5 * 3
    });

    it('should handle amount with currency symbols', () => {
      const csv = `id,customer,address,amount
ORD-001,John Doe,123 Main St,$25.50
ORD-002,Jane Smith,456 Oak Ave,€30.00`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(2);
      expect(result.orders[0].amount).toBe(25.5);
      expect(result.orders[1].amount).toBe(30.0);
    });

    it('should not assign ranks to new CSV orders (ranks set after optimization)', () => {
      const csv = `id,customer,address
ORD-001,John Doe,123 Main St
ORD-002,Jane Smith,456 Oak Ave
ORD-003,Bob Johnson,789 Pine Rd`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(3);
      // New CSV orders should NOT have ranks assigned
      // Ranks are only set after route optimization
      expect(result.orders[0].rank).toBeUndefined();
      expect(result.orders[1].rank).toBeUndefined();
      expect(result.orders[2].rank).toBeUndefined();
    });

    it('should filter out orders with missing required fields', () => {
      const csv = `id,customer,address
ORD-001,John Doe,123 Main St
ORD-002,,456 Oak Ave
ORD-003,Bob Johnson,
ORD-004,Jane Smith,789 Pine Rd`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      // Only ORD-001 and ORD-004 should be valid (have id, customer, and address)
      expect(result.orders.length).toBeGreaterThanOrEqual(1);
      expect(result.orders.every(order => order.id && order.customerName && order.address)).toBe(true);
    });

    it('should handle optional fields gracefully', () => {
      const csv = `id,customer,address
ORD-001,John Doe,123 Main St`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].phone).toBeUndefined();
      expect(result.orders[0].notes).toBeUndefined();
      expect(result.orders[0].amount).toBeUndefined();
    });

    it('should parse notes and items fields', () => {
      const csv = `id,customer,address,notes,items
ORD-001,John Doe,123 Main St,"Leave at door","Widget A, Widget B"`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].notes).toBe('Leave at door');
      expect(result.orders[0].items).toBe('Widget A, Widget B');
    });

    it('should return error for CSV without headers', () => {
      // PapaParse with header: true will treat first row as headers
      // So we need to test with actual data that has no header row
      // When header: true and no headers exist, PapaParse creates numeric indices
      const csv = `ORD-001,John Doe,123 Main St
ORD-002,Jane Smith,456 Oak Ave`;

      const result = CSVParser.parse(csv);

      // PapaParse will parse this but our code checks for empty headers
      // If headers are numeric indices, parsed.meta.fields will be empty or undefined
      // So result should fail or have no valid orders
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.orders).toHaveLength(0);
      } else {
        // If PapaParse auto-detected, orders might be created but without proper structure
        // In this case, orders should be empty due to missing required fields
        expect(result.orders.length).toBe(0);
      }
    });

    it('should return error for empty CSV', () => {
      const csv = '';

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(false);
      expect(result.orders).toHaveLength(0);
    });

    it('should handle CSV with only headers and no data', () => {
      const csv = `id,customer,address`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(0);
      expect(result.headers).toContain('id');
    });

    it('should trim whitespace from headers', () => {
      const csv = ` id , customer , address 
ORD-001,John Doe,123 Main St`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);
      expect(result.headers).toContain('id');
      expect(result.headers).toContain('customer');
    });

    it('should handle alternative coordinate column names (lat/lng, x/y)', () => {
      const csv = `id,customer,address,lat,lng
ORD-001,John Doe,123 Main St,40.7128,-74.0060`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].latitude).toBe(40.7128);
      expect(result.orders[0].longitude).toBe(-74.0060);
    });

    it('should parse package dimensions with units', () => {
      const csv = `id,customer,address,length,width,height,weight
ORD-001,John Doe,123 Main St,10cm,5cm,3cm,2.5kg`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].packageLength).toBe(10);
      expect(result.orders[0].packageWidth).toBe(5);
      expect(result.orders[0].packageHeight).toBe(3);
      expect(result.orders[0].packageWeight).toBe(2.5);
    });

    it('should store raw data in rawData field', () => {
      const csv = `id,customer,address,phone
ORD-001,John Doe,123 Main St,555-0100`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].rawData).toBeDefined();
      expect(result.orders[0].rawData.id).toBe('ORD-001');
      expect(result.orders[0].rawData.customer).toBe('John Doe');
    });

    it('should skip empty lines', () => {
      const csv = `id,customer,address

ORD-001,John Doe,123 Main St

ORD-002,Jane Smith,456 Oak Ave
`;

      const result = CSVParser.parse(csv);

      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(2);
    });
  });

  describe('formatOrdersPreview', () => {
    it('should format orders for display', () => {
      const orders: Order[] = [
        {
          id: 'ORD-001',
          customerName: 'John Doe',
          address: '123 Main St',
          rawData: {},
        },
        {
          id: 'ORD-002',
          customerName: 'Jane Smith',
          address: '456 Oak Ave',
          rawData: {},
        },
      ];

      const preview = CSVParser.formatOrdersPreview(orders);

      expect(preview).toContain('1. ORD-001 - John Doe');
      expect(preview).toContain('123 Main St');
      expect(preview).toContain('2. ORD-002 - Jane Smith');
      expect(preview).toContain('456 Oak Ave');
    });

    it('should handle empty orders array', () => {
      const orders: Order[] = [];
      const preview = CSVParser.formatOrdersPreview(orders);
      expect(preview).toBe('');
    });
  });
});

