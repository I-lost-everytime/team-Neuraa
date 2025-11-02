// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import uploadRoute from "./routes/upload.js";
import landsRoute from "./routes/lands.js";
import { connectDB } from "./utils/db.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Needed to serve static files correctly with ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ✅ Serve static frontend
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

// API routes
app.use("/api/upload", uploadRoute);
app.use("/api/lands", landsRoute);

// ✅ Fallback: serve index.html for any unknown route (for SPA-style routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// Connect to MongoDB and start server
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
  });
