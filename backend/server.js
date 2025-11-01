// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import uploadRoute from "./routes/upload.js";
import landsRoute from "./routes/lands.js";
import { connectDB } from "./utils/db.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
// Routes
console.log("✅ uploadRoute type:", typeof uploadRoute);
app.use("/api/upload", uploadRoute);
console.log("✅ landsRoute type:", typeof landsRoute);
app.use("/api/lands", landsRoute);


// Connect to database and start server
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
  });
