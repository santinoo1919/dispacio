/**
 * Fastify server entry point
 * Smart Dispatch Backend with VROOM integration
 */

import Fastify from "fastify";
import { registerDatabase, runMigrations } from "./db/connection.js";
import optimizeRoutes from "./routes/optimize.js";
import ordersRoutes from "./routes/orders.js";

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
await fastify.register(cors, {
  origin: true, // Allow all origins in development
  credentials: true,
});

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

// Health check endpoint
fastify.get("/health", async (request, reply) => {
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
});

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
