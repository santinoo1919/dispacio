/**
 * Fastify server entry point
 * Smart Dispatch Backend with OR-Tools VRP solver
 */

import Fastify from "fastify";
import { randomUUID } from "crypto";
import { registerDatabase, runMigrations } from "./db/connection.js";
import optimizeRoutes from "./routes/optimize.js";
import ordersRoutes from "./routes/orders.js";
import zonesRoutes from "./routes/zones.js";
import driversRoutes from "./routes/drivers.js";

// Custom plugins
import errorHandler from "./plugins/error-handler.js";
import gracefulShutdown from "./plugins/graceful-shutdown.js";
import requestContext from "./plugins/request-context.js";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          }
        : undefined,
  },
  // Generate request IDs
  genReqId: (req) => req.headers["x-request-id"] || randomUUID(),
});

// Register core plugins first
await fastify.register(errorHandler);
await fastify.register(gracefulShutdown, { timeout: 30000 });
await fastify.register(requestContext);

// CORS configuration
import cors from "@fastify/cors";
const isDevelopment = process.env.NODE_ENV !== "production";
await fastify.register(cors, {
  origin: isDevelopment
    ? true // Allow all origins in development
    : process.env.ALLOWED_ORIGINS?.split(",") || false, // Restrict in production
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// Rate limiting - protect against abuse and control costs
import rateLimit from "@fastify/rate-limit";
await fastify.register(rateLimit, {
  global: true, // Apply to all routes by default
  max: isDevelopment ? 1000 : 100, // Requests per window (relaxed in dev)
  timeWindow: "1 minute",
  
  // Identify requester by IP
  keyGenerator: (request) => {
    // Use X-Forwarded-For if behind proxy (e.g., Cloudflare, nginx)
    return request.headers["x-forwarded-for"]?.split(",")[0] || request.ip;
  },
  
  // Custom error response
  errorResponseBuilder: (request, context) => ({
    statusCode: 429,
    error: "Too Many Requests",
    message: `Rate limit exceeded. You can make ${context.max} requests per ${context.after}. Try again in ${context.after}.`,
    retryAfter: context.after,
  }),
  
  // Add headers to show rate limit status
  addHeaders: {
    "x-ratelimit-limit": true,
    "x-ratelimit-remaining": true,
    "x-ratelimit-reset": true,
    "retry-after": true,
  },
});
fastify.log.info(`Rate limiting enabled: ${isDevelopment ? 1000 : 100} requests/minute`);

// Swagger/OpenAPI documentation
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { commonSchemas, publicSchemas } from "./schemas/index.js";

await fastify.register(swagger, {
  openapi: {
    info: {
      title: "Smart Dispatch API",
      description: "API for smart dispatch with OR-Tools route optimization",
      version: "1.0.0",
    },
    servers: [
      {
        url: isDevelopment
          ? `http://localhost:${process.env.PORT || 3000}`
          : process.env.API_URL || `https://api.yourapp.com`,
        description: isDevelopment ? "Development server" : "Production server",
      },
    ],
    tags: [
      { name: "orders", description: "Order management endpoints" },
      { name: "routes", description: "Route optimization endpoints" },
      { name: "zones", description: "Zone management endpoints" },
      { name: "drivers", description: "Driver management endpoints" },
      { name: "health", description: "Health check endpoints" },
    ],
    components: {
      schemas: publicSchemas, // Use public schemas (hides sensitive fields)
    },
  },
});

// Only register Swagger UI in development (security: don't expose API docs in production)
if (isDevelopment) {
  await fastify.register(swaggerUI, {
    routePrefix: "/docs", // Access docs at http://localhost:3000/docs
    uiConfig: {
      docExpansion: "list", // or "full" to expand all
      deepLinking: true,
      persistAuthorization: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });
  fastify.log.info("Swagger UI available at /docs (development only)");
} else {
  fastify.log.info("Swagger UI disabled in production");
}

// Register database
await registerDatabase(fastify);

// Run migrations on startup (in production, use proper migration tool)
if (process.env.RUN_MIGRATIONS !== "false") {
  try {
    await runMigrations(fastify);
  } catch (error) {
    fastify.log.warn("Migration skipped or failed:", error.message);
  }
}

// Register routes
await fastify.register(ordersRoutes, { prefix: "/api/orders" });
await fastify.register(optimizeRoutes, { prefix: "/api/routes" });
await fastify.register(zonesRoutes, { prefix: "/api/zones" });
await fastify.register(driversRoutes, { prefix: "/api/drivers" });

// ============================================
// Health Check Endpoints (Kubernetes-style)
// ============================================

// Liveness probe - is the server alive?
// Used by orchestrators to restart unhealthy containers
fastify.get(
  "/health/live",
  {
    schema: {
      tags: ["health"],
      summary: "Liveness probe",
      description: "Check if the server is alive (for container orchestration)",
    },
    config: { rateLimit: { max: 1000, timeWindow: "1 minute" } }, // Don't rate limit health checks
  },
  async (request, reply) => {
    // If we can respond, we're alive
    // Check if we're shutting down
    if (fastify.isShuttingDown?.()) {
      reply.code(503);
      return { status: "shutting_down" };
    }
    return { status: "ok" };
  }
);

// Readiness probe - is the server ready to accept traffic?
// Used by load balancers to route traffic
fastify.get(
  "/health/ready",
  {
    schema: {
      tags: ["health"],
      summary: "Readiness probe",
      description: "Check if the server is ready to accept traffic (database connected)",
    },
    config: { rateLimit: { max: 1000, timeWindow: "1 minute" } },
  },
  async (request, reply) => {
    // Check if shutting down
    if (fastify.isShuttingDown?.()) {
      reply.code(503);
      return { status: "shutting_down", ready: false };
    }

    // Check database connectivity
    try {
      const start = Date.now();
      await fastify.pg.query("SELECT 1");
      const dbLatency = Date.now() - start;

      return {
        status: "ok",
        ready: true,
        checks: {
          database: { status: "ok", latency: `${dbLatency}ms` },
        },
      };
    } catch (error) {
      reply.code(503);
      return {
        status: "error",
        ready: false,
        checks: {
          database: { status: "error", error: error.message },
        },
      };
    }
  }
);

// Full health check - detailed system status
fastify.get(
  "/health",
  {
    schema: {
      tags: ["health"],
      summary: "Full health check",
      description: "Comprehensive health check with system information",
      response: {
        200: commonSchemas.HealthResponse,
        503: commonSchemas.HealthResponse,
      },
    },
    config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
  },
  async (request, reply) => {
    const checks = {
      database: { status: "unknown" },
    };

    let overallStatus = "ok";

    // Check database
    try {
      const start = Date.now();
      const result = await fastify.pg.query("SELECT NOW() as time, current_database() as db");
      checks.database = {
        status: "ok",
        latency: `${Date.now() - start}ms`,
        database: result.rows[0].db,
        serverTime: result.rows[0].time,
      };
    } catch (error) {
      checks.database = { status: "error", error: error.message };
      overallStatus = "degraded";
    }

    // System info
    const systemInfo = {
      uptime: `${Math.floor(process.uptime())}s`,
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      },
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || "development",
    };

    if (overallStatus !== "ok") {
      reply.code(503);
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      system: systemInfo,
    };
  }
);

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || "0.0.0.0";

    await fastify.listen({ port, host });
    fastify.log.info(`Server listening on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
