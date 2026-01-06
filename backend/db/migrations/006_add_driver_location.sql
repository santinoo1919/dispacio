-- Migration 006: Add location fields to drivers table
-- Drivers need location for route optimization and nearest driver matching

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Index for fast location-based queries (nearest driver)
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers(location_lat, location_lng) WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- Index for active drivers only
CREATE INDEX IF NOT EXISTS idx_drivers_active ON drivers(is_active) WHERE is_active = true;

