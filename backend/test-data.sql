-- Test Data Script: Create 3 drivers and multiple orders with coordinates

-- 1. Create 3 test drivers
INSERT INTO drivers (name, phone) VALUES
  ('John Smith', '555-0100'),
  ('Sarah Johnson', '555-0200'),
  ('Mike Williams', '555-0300')
ON CONFLICT DO NOTHING
RETURNING id, name, phone;

-- 2. Get driver IDs (we'll use these for orders)
-- Note: In a real scenario, you'd capture these IDs, but for testing we'll use subqueries

-- 3. Create vehicles for each driver (optional but helpful for capacity constraints)
INSERT INTO vehicles (driver_id, max_weight, max_volume, max_length, max_width, max_height)
SELECT 
  d.id,
  1000,  -- max_weight in kg
  100000, -- max_volume in cm³
  300,   -- max_length in cm
  200,   -- max_width in cm
  200    -- max_height in cm
FROM drivers d
WHERE d.name IN ('John Smith', 'Sarah Johnson', 'Mike Williams')
ON CONFLICT DO NOTHING;

-- 4. Create orders for Driver 1 (John Smith) - Dubai area coordinates
INSERT INTO orders (
  order_number, customer_name, address, phone, notes,
  latitude, longitude, driver_id, 
  package_weight, package_volume, package_length, package_width, package_height,
  amount, priority
) VALUES
  ('ORD-001', 'Customer A', '123 Sheikh Zayed Road', '555-1001', 'Fragile', 25.2048, 55.2708, (SELECT id FROM drivers WHERE name = 'John Smith'), 10, 5000, 30, 20, 20, 150.00, 'normal'),
  ('ORD-002', 'Customer B', '456 Jumeirah Beach', '555-1002', NULL, 25.2148, 55.2808, (SELECT id FROM drivers WHERE name = 'John Smith'), 15, 7500, 40, 25, 25, 200.00, 'normal'),
  ('ORD-003', 'Customer C', '789 Dubai Marina', '555-1003', 'Express', 25.2248, 55.2908, (SELECT id FROM drivers WHERE name = 'John Smith'), 20, 10000, 50, 30, 30, 250.00, 'high'),
  ('ORD-004', 'Customer D', '321 Business Bay', '555-1004', NULL, 25.2348, 55.3008, (SELECT id FROM drivers WHERE name = 'John Smith'), 12, 6000, 35, 22, 22, 180.00, 'normal'),
  ('ORD-005', 'Customer E', '654 Downtown Dubai', '555-1005', NULL, 25.2448, 55.3108, (SELECT id FROM drivers WHERE name = 'John Smith'), 18, 9000, 45, 28, 28, 220.00, 'normal')
ON CONFLICT (order_number) DO NOTHING;

-- 5. Create orders for Driver 2 (Sarah Johnson) - Different area
INSERT INTO orders (
  order_number, customer_name, address, phone, notes,
  latitude, longitude, driver_id,
  package_weight, package_volume, package_length, package_width, package_height,
  amount, priority
) VALUES
  ('ORD-006', 'Customer F', '111 Deira', '555-2001', NULL, 25.2648, 55.3208, (SELECT id FROM drivers WHERE name = 'Sarah Johnson'), 8, 4000, 25, 18, 18, 120.00, 'normal'),
  ('ORD-007', 'Customer G', '222 Bur Dubai', '555-2002', 'Handle with care', 25.2748, 55.3308, (SELECT id FROM drivers WHERE name = 'Sarah Johnson'), 14, 7000, 38, 24, 24, 190.00, 'normal'),
  ('ORD-008', 'Customer H', '333 Al Barsha', '555-2003', NULL, 25.2848, 55.3408, (SELECT id FROM drivers WHERE name = 'Sarah Johnson'), 16, 8000, 42, 26, 26, 210.00, 'normal'),
  ('ORD-009', 'Customer I', '444 JBR', '555-2004', 'Express', 25.2948, 55.3508, (SELECT id FROM drivers WHERE name = 'Sarah Johnson'), 22, 11000, 52, 32, 32, 280.00, 'high')
ON CONFLICT (order_number) DO NOTHING;

-- 6. Create orders for Driver 3 (Mike Williams)
INSERT INTO orders (
  order_number, customer_name, address, phone, notes,
  latitude, longitude, driver_id,
  package_weight, package_volume, package_length, package_width, package_height,
  amount, priority
) VALUES
  ('ORD-010', 'Customer J', '555 Al Quoz', '555-3001', NULL, 25.1748, 55.2508, (SELECT id FROM drivers WHERE name = 'Mike Williams'), 11, 5500, 32, 21, 21, 160.00, 'normal'),
  ('ORD-011', 'Customer K', '666 Media City', '555-3002', NULL, 25.1848, 55.2608, (SELECT id FROM drivers WHERE name = 'Mike Williams'), 13, 6500, 36, 23, 23, 175.00, 'normal'),
  ('ORD-012', 'Customer L', '777 Internet City', '555-3003', 'Fragile', 25.1948, 55.2708, (SELECT id FROM drivers WHERE name = 'Mike Williams'), 17, 8500, 43, 27, 27, 230.00, 'normal'),
  ('ORD-013', 'Customer M', '888 Palm Jumeirah', '555-3004', NULL, 25.1048, 55.2408, (SELECT id FROM drivers WHERE name = 'Mike Williams'), 19, 9500, 47, 29, 29, 240.00, 'normal'),
  ('ORD-014', 'Customer N', '999 Knowledge Park', '555-3005', 'Express', 25.1148, 55.2508, (SELECT id FROM drivers WHERE name = 'Mike Williams'), 21, 10500, 51, 31, 31, 270.00, 'high')
ON CONFLICT (order_number) DO NOTHING;

-- 7. Display summary
SELECT 
  'Drivers created:' as summary,
  COUNT(*) as count
FROM drivers
WHERE name IN ('John Smith', 'Sarah Johnson', 'Mike Williams');

SELECT 
  'Orders created:' as summary,
  COUNT(*) as count,
  driver_id,
  (SELECT name FROM drivers WHERE id = orders.driver_id) as driver_name
FROM orders
WHERE order_number LIKE 'ORD-%'
GROUP BY driver_id
ORDER BY driver_name;
