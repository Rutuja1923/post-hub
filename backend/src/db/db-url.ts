import "dotenv/config";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("Missing DATABASE_URL in environment variables");
}

export const DATABASE_URL = dbUrl;
