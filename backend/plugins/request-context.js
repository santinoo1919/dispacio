/**
 * Request Context Plugin
 * Adds request ID and timing to all requests for tracing
 */

import fp from "fastify-plugin";
import { randomUUID } from "crypto";

async function requestContextPlugin(fastify, options) {
  // Add request ID to every request
  fastify.addHook("onRequest", async (request, reply) => {
    // Use existing request ID from header (e.g., from load balancer) or generate new one
    const requestId =
      request.headers["x-request-id"] ||
      request.headers["x-correlation-id"] ||
      randomUUID();

    // Store on request object
    request.requestId = requestId;
    request.startTime = Date.now();

    // Add to response headers for client-side debugging
    reply.header("x-request-id", requestId);
  });

  // Log request completion with timing
  fastify.addHook("onResponse", async (request, reply) => {
    const duration = Date.now() - request.startTime;

    // Log with structured data
    const logData = {
      requestId: request.requestId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration}ms`,
      userAgent: request.headers["user-agent"]?.substring(0, 50),
    };

    // Different log levels based on status
    if (reply.statusCode >= 500) {
      fastify.log.error(logData, "Request completed with error");
    } else if (reply.statusCode >= 400) {
      fastify.log.warn(logData, "Request completed with client error");
    } else if (duration > 5000) {
      fastify.log.warn(logData, "Slow request completed");
    } else {
      fastify.log.info(logData, "Request completed");
    }
  });

  fastify.log.info("Request context tracking enabled");
}

export default fp(requestContextPlugin, {
  name: "request-context",
  fastify: "4.x",
});

