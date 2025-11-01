// models/Land.js
import mongoose from "mongoose";

const landSchema = new mongoose.Schema({
  wallet_address: { type: String, required: true },
  file_name: { type: String, required: true },
  cid: { type: String, required: true },
  hex_string: { type: String, required: true },
  uploaded_at: { type: Date, default: Date.now },
});

// ✅ Prevent OverwriteModelError by re-using an existing compiled model
export const Land = mongoose.models.Land || mongoose.model("Land", landSchema);
