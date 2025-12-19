-- Initial schema for smart dispatch system

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    initials VARCHAR(10),
    color VARCHAR(7),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Vehicles table (capacity constraints)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50),
    max_weight DECIMAL(8, 2),
    max_volume DECIMAL(10, 2),
    max_length DECIMAL(8, 2),
    max_width DECIMAL(8, 2),
    max_height DECIMAL(8, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table with package dimensions
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(255) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50),
    notes TEXT,
    amount DECIMAL(10, 2),
    items TEXT,
    priority VARCHAR(20) DEFAULT 'normal',
    
    -- Package capacity (critical for VROOM)
    package_length DECIMAL(8, 2),
    package_width DECIMAL(8, 2),
    package_height DECIMAL(8, 2),
    package_weight DECIMAL(8, 2),
    package_volume DECIMAL(10, 2),
    
    -- Coordinates
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Assignment
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    route_rank INTEGER,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    raw_data JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_route_rank ON orders(driver_id, route_rank);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
