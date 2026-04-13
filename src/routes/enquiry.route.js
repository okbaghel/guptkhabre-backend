import express from "express";
import {
  createEnquiry,
  getEnquiries,
  updateEnquiryStatus,
  deleteEnquiry,
} from "../controllers/enquiry.controller.js";

import { protect, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// 🔥 PUBLIC
router.post("/", createEnquiry);

// 🔥 ADMIN
router.get("/", protect, isAdmin, getEnquiries);
router.put("/:id", protect, isAdmin, updateEnquiryStatus);
router.delete("/:id", protect, isAdmin, deleteEnquiry);

export default router;