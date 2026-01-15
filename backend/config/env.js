/**
 * Simple environment variable validation
 * Validates required env vars on startup and exits if missing
 */

export function validateEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const missing = [];

  // Required in production
  if (isProduction) {
    if (!process.env.DATABASE_URL) {
      missing.push("DATABASE_URL");
    }
  }

  // Validate DATABASE_URL format if provided
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("postgresql://")) {
    console.error("❌ DATABASE_URL must start with 'postgresql://'");
    console.error(`   Got: ${process.env.DATABASE_URL.substring(0, 30)}...`);
    process.exit(1);
  }

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error("\n💡 Set these in your production environment before starting the server.");
    process.exit(1);
  }

  if (isProduction) {
    console.log("✅ Environment variables validated");
  }
}

