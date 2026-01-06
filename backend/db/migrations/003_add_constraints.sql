-- Migration 003: Add constraints, indexes, and optimistic locking
-- Purpose: Data correctness, performance, and concurrency safety

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Partial index for unassigned orders only (smaller, faster)
CREATE INDEX IF NOT EXISTS idx_unassigned_orders ON orders(created_at DESC) 
  WHERE driver_id IS NULL;

-- Composite index for common query: driver's orders in a zone
CREATE INDEX IF NOT EXISTS idx_orders_driver_zone ON orders(driver_id, zone_id);

-- ============================================
-- DATA INTEGRITY CONSTRAINTS
-- ============================================

-- Prevent negative monetary amounts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'positive_amount'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT positive_amount 
      CHECK (amount IS NULL OR amount >= 0);
  END IF;
END $$;

-- Prevent negative package dimensions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'positive_package_dims'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT positive_package_dims 
      CHECK (
        (package_length IS NULL OR package_length >= 0) AND
        (package_width IS NULL OR package_width >= 0) AND
        (package_height IS NULL OR package_height >= 0) AND
        (package_weight IS NULL OR package_weight >= 0) AND
        (package_volume IS NULL OR package_volume >= 0)
      );
  END IF;
END $$;

-- Ensure coordinates are valid (lat: -90 to 90, lng: -180 to 180)
-- Both must be present or both must be null
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_coordinates'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT valid_coordinates
      CHECK (
        (latitude IS NULL AND longitude IS NULL) OR 
        (
          latitude IS NOT NULL AND longitude IS NOT NULL AND
          latitude BETWEEN -90 AND 90 AND 
          longitude BETWEEN -180 AND 180
        )
      );
  END IF;
END $$;

-- Ensure route_rank is positive when set
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'positive_route_rank'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT positive_route_rank 
      CHECK (route_rank IS NULL OR route_rank > 0);
  END IF;
END $$;

-- Validate priority values (enum-like constraint)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_priority'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT valid_priority 
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

-- ============================================
-- OPTIMISTIC LOCKING
-- ============================================

-- Add version column for concurrent update detection
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- ============================================
-- VEHICLE CONSTRAINTS
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'positive_vehicle_capacity'
  ) THEN
    ALTER TABLE vehicles ADD CONSTRAINT positive_vehicle_capacity 
      CHECK (
        (max_weight IS NULL OR max_weight > 0) AND
        (max_volume IS NULL OR max_volume > 0) AND
        (max_length IS NULL OR max_length > 0) AND
        (max_width IS NULL OR max_width > 0) AND
        (max_height IS NULL OR max_height > 0)
      );
  END IF;
END $$;

