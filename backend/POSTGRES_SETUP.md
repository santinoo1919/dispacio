# PostgreSQL Direct Setup Guide

This guide helps you set up PostgreSQL directly (without Docker) to master PostgreSQL.

## Installation

### macOS

**Option 1: Homebrew (Recommended)**

```bash
# Install PostgreSQL 15
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify it's running
brew services list
```

**Option 2: Postgres.app (GUI)**

1. Download from https://postgresapp.com/
2. Open the app
3. Click "Initialize" to create a new server
4. The server runs on port 5432 by default

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Auto-start on boot
```

### Windows

1. Download installer from https://www.postgresql.org/download/windows/
2. Run installer
3. During setup, remember the password you set for the `postgres` user
4. PostgreSQL service starts automatically

## Initial Setup

### 1. Connect to PostgreSQL

**macOS/Linux:**

```bash
# Connect as your current user (if you installed via Homebrew)
psql postgres

# Or connect as postgres user
psql -U postgres
```

**Windows:**

- Use pgAdmin (GUI) or Command Prompt:

```cmd
psql -U postgres
```

### 2. Create Database and User

Once connected, run these SQL commands:

```sql
-- List existing databases
\l

-- Create database for dispacio
CREATE DATABASE dispacio;

-- Create a dedicated user (optional, you can use postgres user)
CREATE USER dispacio_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE dispacio TO dispacio_user;

-- Connect to the new database
\c dispacio

-- Verify connection
SELECT current_database();
```

### 3. Test Connection

```bash
# From terminal, test connection
psql -U postgres -d dispacio

# Or with password prompt
psql -h localhost -U postgres -d dispacio
```

## Useful PostgreSQL Commands

### Basic Commands (in psql)

```sql
-- List databases
\l

-- Connect to database
\c database_name

-- List tables
\dt

-- Describe table structure
\d table_name

-- List all users
\du

-- Exit psql
\q
```

### Common SQL Operations

```sql
-- Show all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Count rows in a table
SELECT COUNT(*) FROM orders;

-- View table data
SELECT * FROM orders LIMIT 10;

-- Check table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders';
```

## Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

Examples:

- `postgresql://postgres:postgres@localhost:5432/dispacio`
- `postgresql://dispacio_user:password@localhost:5432/dispacio`

## Troubleshooting

### PostgreSQL not running

```bash
# macOS (Homebrew)
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Check status
brew services list  # macOS
sudo systemctl status postgresql  # Linux
```

### Connection refused

- Check if PostgreSQL is running
- Verify port 5432 is not blocked
- Check `pg_hba.conf` for authentication settings

### Permission denied

- Make sure user has privileges: `GRANT ALL PRIVILEGES ON DATABASE dispacio TO your_user;`
- Check PostgreSQL logs for details

## Next Steps

1. Run migrations: Start the Fastify server and migrations will run automatically
2. Test API: `curl http://localhost:3000/health`
3. Create orders via API: `POST /api/orders`

## Learning Resources

- PostgreSQL docs: https://www.postgresql.org/docs/
- Interactive tutorial: https://www.postgresqltutorial.com/
- SQL basics: https://www.w3schools.com/sql/

