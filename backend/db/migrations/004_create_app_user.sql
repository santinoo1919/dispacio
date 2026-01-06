-- Migration 004: Create limited application user
-- Purpose: Security - don't use superuser in production

-- This migration creates a limited database user for the application.
-- Run this MANUALLY in production by a DBA, not via auto-migration.
-- The password should be set via environment variable, not hardcoded.

-- ============================================
-- INSTRUCTIONS FOR PRODUCTION
-- ============================================
-- 1. Connect as superuser (postgres)
-- 2. Run this script with a SECURE password
-- 3. Update DATABASE_URL in your environment:
--    DATABASE_URL=postgresql://dispacio_app:YOUR_SECURE_PASSWORD@host:5432/dispacio

-- ============================================
-- CREATE APPLICATION USER
-- ============================================

DO $$
BEGIN
  -- Create user if not exists (password should be changed in production!)
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dispacio_app') THEN
    CREATE USER dispacio_app WITH PASSWORD 'change_me_in_production';
    RAISE NOTICE 'Created user dispacio_app';
  ELSE
    RAISE NOTICE 'User dispacio_app already exists';
  END IF;
END
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Connect to database permissions
GRANT CONNECT ON DATABASE dispacio TO dispacio_app;

-- Schema permissions
GRANT USAGE ON SCHEMA public TO dispacio_app;

-- Table permissions (read/write, no DDL)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dispacio_app;

-- Sequence permissions (for auto-increment/UUID generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dispacio_app;

-- Future tables get same permissions automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dispacio_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT USAGE, SELECT ON SEQUENCES TO dispacio_app;

-- ============================================
-- WHAT THIS USER CANNOT DO (security)
-- ============================================
-- ✗ DROP DATABASE
-- ✗ DROP TABLE
-- ✗ CREATE TABLE (schema changes)
-- ✗ CREATE/DROP users
-- ✗ Access other databases
-- ✗ TRUNCATE tables
-- ✗ Execute arbitrary functions

-- ============================================
-- VERIFY PERMISSIONS (run as dispacio_app)
-- ============================================
-- SELECT * FROM orders LIMIT 1;  -- Should work
-- DROP TABLE orders;              -- Should fail: permission denied

