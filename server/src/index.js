import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import { apiLimiter, authLimiter } from "./middleware/rateLimit.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import schoolRoutes from "./routes/schools.routes.js";
import reviewRoutes from "./routes/reviews.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = String(
  process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN || "http://localhost:5173",
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required to start the server.");
}

app.set("trust proxy", 1);

// ─── Security & Utility Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl, server-to-server) and configured origins.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
if (!isProduction) {
  app.use(morgan("dev")); // for development, use 'dev' for concise output colored by response status
} else {
  // app.use(morgan("tiny")); // for production, use 'tiny' for minimal output
  app.use(morgan("short")); // for production, use 'short' for concise output
}

// ─── Body Parsers & Cookie Parser ───────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use(cookieParser());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI ?? "mongodb://localhost:27017/school_finder",
    );
    console.log("MongoDB connected");
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "School Finder API is running 🚀" });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptimeSeconds: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/reviews", reviewRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const statusCode = err.status || 500;
  console.error(err.stack);
  res.status(statusCode).json({
    message: statusCode >= 500 && isProduction ? "Internal Server Error" : err.message || "Internal Server Error",
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
