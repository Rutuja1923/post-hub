import express from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const app = express();

// Root connection
app.get("/", async (req, res) => {
  try {
    res.status(200).json({ message: "Hello" });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// DB health check
app.get("/health", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT 1`);
    res.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(503).json({
      status: "unhealthy",
      error:
        error instanceof Error ? error.message : "Database connection failed",
      timestamp: new Date().toISOString(),
    });
  }
});

export default app;
