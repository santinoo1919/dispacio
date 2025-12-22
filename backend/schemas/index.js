/**
 * Central export for all schemas
 */
export * from "./common.js";
export * from "./orders.js";
export * from "./routes.js";
export * from "./zones.js";

// Export combined schemas for Swagger
import { commonSchemas } from "./common.js";
import { orderSchemas } from "./orders.js";
import { routeSchemas } from "./routes.js";
import { zoneSchemas } from "./zones.js";

export const publicSchemas = {
  ...commonSchemas,
  ...orderSchemas,
  ...routeSchemas,
  ...zoneSchemas,
};
