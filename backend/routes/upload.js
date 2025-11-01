import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { bufferToHex } from "../utils/hex.js";

dotenv.config();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Define a simple schema for uploaded files
const landSchema = new mongoose.Schema({
  wallet_address: { type: String, required: true },
  file_name: { type: String, required: true },
  cid: { type: String, required: true },
  hex_string: { type: String, required: true },
  uploaded_at: { type: Date, default: Date.now },
});

// Create model if it doesn’t already exist
const Land = mongoose.models.Land || mongoose.model("Land", landSchema);

// ✅ Test route
router.get("/test", (req, res) => {
  res.json({ message: "✅ Upload route is working (with MongoDB)!" });
});

// ✅ Upload route
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const file = req.file;
    const data = new FormData();
    data.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    // Upload to Pinata
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      data,
      {
        maxBodyLength: Infinity,
        headers: {
          ...data.getHeaders(),
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
      }
    );

    const cid = response.data.IpfsHash;
    const hexString = bufferToHex(file.buffer);

    // ✅ Save metadata to MongoDB
    const newLand = new Land({
      wallet_address: req.body.wallet_address || "unknown_wallet",
      file_name: file.originalname,
      cid,
      hex_string: hexString,
    });

    await newLand.save();
    console.log("✅ File info saved to MongoDB");

    res.json({
      success: true,
      cid,
      hexString,
      message: "✅ File uploaded to IPFS and saved to MongoDB",
    });
  } catch (err) {
    console.error("Upload error:", err.response?.data || err.message);
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});

export default router;
