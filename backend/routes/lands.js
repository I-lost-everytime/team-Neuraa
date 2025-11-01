// routes/lands.js
import express from "express";
import { Land } from "../models/Land.js";   // ✅ use shared model

const router = express.Router();

// ✅ Fetch all lands by wallet address
router.get("/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const lands = await Land.find({ wallet_address: address });
    res.json(lands);
  } catch (err) {
    console.error("Database query error:", err.message);
    res.status(500).json({ error: "Failed to fetch lands" });
  }
});

// ✅ Create a new land record
router.post("/", async (req, res) => {
  try {
    const { wallet_address, file_name, cid, hex_string } = req.body;

    const newLand = new Land({ wallet_address, file_name, cid, hex_string });
    await newLand.save();

    res.json({ success: true, message: "Land saved successfully!" });
  } catch (err) {
    console.error("Database insert error:", err.message);
    res.status(500).json({ error: "Failed to save land" });
  }
});

export default router;
