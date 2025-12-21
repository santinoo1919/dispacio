# Dispacio Backend

Fastify backend with PostgreSQL and OR-Tools VRP solver for smart dispatch route optimization.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup PostgreSQL (Direct Installation)

**Install PostgreSQL:**

**macOS (using Homebrew):**

```bash
brew install postgresql@15
brew services start postgresql@15
```

**macOS (using Postgres.app):**

- Download from https://postgresapp.com/
- Start the app and initialize a new server

**Linux (Ubuntu/Debian):**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**

- Download installer from https://www.postgresql.org/download/windows/
- Run installer and follow setup wizard

**Create Database and User:**

After installation, connect to PostgreSQL:

```bash
# macOS/Linux: connect as your user or postgres user
psql postgres

# Or if you need to specify user:
psql -U postgres
```

Then run these SQL commands:

```sql
-- Create database
CREATE DATABASE dispacio;

-- Create user (optional, or use default postgres user)
CREATE USER dispacio_user WITH PASSWORD 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE dispacio TO dispacio_user;

-- Connect to the new database
\c dispacio
```

**Update Connection String:**

Update `DATABASE_URL` in your `.env` file:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dispacio
# Or if you created a user:
DATABASE_URL=postgresql://dispacio_user:your_password@localhost:5432/dispacio
```

### 3. Route Optimization

Route optimization uses OR-Tools (node_or_tools) which runs directly in Node.js - no Docker or external services needed!

### 4. Environment Variables

Create `.env` file (optional):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dispacio
PORT=3000
LOG_LEVEL=info
RUN_MIGRATIONS=true
```

### 5. Run Server

```bash
npm start
# or for development with auto-reload
npm run dev
```

Server will start on `http://localhost:3000`

## API Endpoints

### Health Check

- `GET /health` - Check server and database status

### Orders

- `GET /api/orders` - List orders (query: `driver_id`, `limit`, `offset`)
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Bulk create orders (body: `{ orders: [...] }`)
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Route Optimization

- `POST /api/routes/optimize` - Optimize route for driver
  - Body: `{ driverId: "uuid", orderIds?: ["uuid1", ...] }`
  - Returns: Optimized route with distances and updated order ranks

## Database Schema

See `db/migrations/001_initial.sql` for schema:

- `orders` - Orders with package dimensions
- `drivers` - Driver information
- `vehicles` - Vehicle capacity constraints

## Development

The server uses ES modules (`type: "module"`), so use `import` syntax.

For development with auto-reload:

```bash
npm run dev
```
