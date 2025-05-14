import express from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth-routes";

const app = express();

//middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root connection
app.get("/", async (req, res) => {
  try {
    res.status(200).json({ message: "Hello" });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

//db health check
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

//api routes
app.use("/api/auth", authRoutes); 

export default app;
