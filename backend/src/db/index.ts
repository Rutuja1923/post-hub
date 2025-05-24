import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { DATABASE_URL } from "./db-url";
import * as schema from "./schema";

const client = postgres(DATABASE_URL);

export const db = drizzle(client, {
  schema,
  logger: {
    logQuery: (query, params) => {
      console.log("\nSQL QUERY:\n", query);
      console.log("\nParams:\n", params, "\n");
    }
  },
});

export type Database = typeof db;
