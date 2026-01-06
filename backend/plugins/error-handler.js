/**
 * Global Error Handler Plugin
 * Provides consistent error responses across all routes
 */

import fp from "fastify-plugin";

/**
 * Standard error response format
 */
function formatError(statusCode, error, message, details = null) {
  const response = {
    statusCode,
    error,
    message,
    timestamp: new Date().toISOString(),
  };

  if (details && process.env.NODE_ENV !== "production") {
    response.details = details; // Only show details in development
  }

  return response;
}

/**
 * Map common errors to appropriate HTTP status codes
 */
function getStatusFromError(error) {
  // Fastify validation errors
  if (error.validation) {
    return { status: 400, type: "Validation Error" };
  }

  // PostgreSQL errors
  if (error.code) {
    switch (error.code) {
      case "23505": // unique_violation
        return { status: 409, type: "Conflict" };
      case "23503": // foreign_key_violation
        return { status: 400, type: "Invalid Reference" };
      case "23502": // not_null_violation
        return { status: 400, type: "Missing Required Field" };
      case "22P02": // invalid_text_representation (e.g., invalid UUID)
        return { status: 400, type: "Invalid Format" };
      case "57014": // query_canceled (timeout)
        return { status: 503, type: "Service Unavailable" };
      case "53300": // too_many_connections
        return { status: 503, type: "Service Unavailable" };
      default:
        return { status: 500, type: "Database Error" };
    }
  }

  // Rate limit errors
  if (error.statusCode === 429) {
    return { status: 429, type: "Too Many Requests" };
  }

  // Default to 500
  return { status: error.statusCode || 500, type: "Internal Server Error" };
}

async function errorHandlerPlugin(fastify, options) {
  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    const { status, type } = getStatusFromError(error);

    // Log error with request context
    const logData = {
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: status,
      error: error.message,
    };

    if (status >= 500) {
      fastify.log.error(logData, "Server error");
      if (process.env.NODE_ENV !== "production") {
        fastify.log.error(error.stack);
      }
    } else if (status >= 400) {
      fastify.log.warn(logData, "Client error");
    }

    // Send consistent error response
    reply.status(status).send(
      formatError(
        status,
        type,
        error.message,
        error.validation || error.stack?.split("\n").slice(0, 3)
      )
    );
  });

  // Handle 404 Not Found
  fastify.setNotFoundHandler((request, reply) => {
    fastify.log.warn(
      { requestId: request.id, method: request.method, url: request.url },
      "Route not found"
    );

    reply.status(404).send(
      formatError(404, "Not Found", `Route ${request.method} ${request.url} not found`)
    );
  });
}

export default fp(errorHandlerPlugin, {
  name: "error-handler",
  fastify: "4.x",
});

