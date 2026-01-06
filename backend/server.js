/**
 * Fastify server entry point
 * Smart Dispatch Backend with OR-Tools VRP solver
 */

import Fastify from "fastify";
import { registerDatabase, runMigrations } from "./db/connection.js";
import optimizeRoutes from "./routes/optimize.js";
import ordersRoutes from "./routes/orders.js";
import zonesRoutes from "./routes/zones.js";

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
});

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

// Health check endpoint
fastify.get(
  "/health",
  {
    schema: {
      tags: ["health"],
      summary: "Health check endpoint",
      description: "Check API and database connectivity",
      response: {
        200: commonSchemas.HealthResponse,
        503: commonSchemas.HealthResponse,
      },
    },
  },
  async (request, reply) => {
    try {
      const result = await fastify.pg.query("SELECT NOW()");
      return {
        status: "ok",
        database: "connected",
        timestamp: result.rows[0].now,
      };
    } catch (error) {
      reply.code(503);
      return {
        status: "error",
        database: "disconnected",
        error: error.message,
      };
    }
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
