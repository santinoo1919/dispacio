/**
 * Graceful Shutdown Plugin
 * Ensures clean shutdown without dropping active connections
 */

import fp from "fastify-plugin";

async function gracefulShutdownPlugin(fastify, options) {
  const shutdownTimeout = options.timeout || 30000; // 30 seconds default

  let isShuttingDown = false;

  // Track shutdown state for health checks
  fastify.decorate("isShuttingDown", () => isShuttingDown);

  async function shutdown(signal) {
    if (isShuttingDown) {
      fastify.log.warn("Shutdown already in progress...");
      return;
    }

    isShuttingDown = true;
    fastify.log.info(`Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    fastify.log.info("Stopping new connections...");

    try {
      // Close server with timeout
      await Promise.race([
        fastify.close(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Shutdown timeout")),
            shutdownTimeout
          )
        ),
      ]);

      fastify.log.info("Server closed successfully");
      process.exit(0);
    } catch (error) {
      fastify.log.error("Error during shutdown:", error.message);
      process.exit(1);
    }
  }

  // Register signal handlers
  const signals = ["SIGTERM", "SIGINT"];
  signals.forEach((signal) => {
    process.on(signal, () => shutdown(signal));
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    fastify.log.fatal({ error: error.message, stack: error.stack }, "Uncaught exception");
    shutdown("uncaughtException");
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    fastify.log.fatal({ reason, promise }, "Unhandled promise rejection");
    shutdown("unhandledRejection");
  });

  fastify.log.info("Graceful shutdown handlers registered");
}

export default fp(gracefulShutdownPlugin, {
  name: "graceful-shutdown",
  fastify: "4.x",
});

