import express from "express";
import {
  createEnquiry,
  getEnquiries,
  updateEnquiryStatus,
  deleteEnquiry,
} from "../controllers/enquiry.controller.js";

import { protect, isAdmin } from "../middleware/auth.middleware.js";
import { contactLimiter }   from "../middleware/rateLimiter.js";

const router = express.Router();

// Public — rate-limited: 3 submissions / 10 min per IP (anti-spam)
router.post("/", contactLimiter, createEnquiry);

// Admin
router.get("/",    protect, isAdmin, getEnquiries);
router.put("/:id", protect, isAdmin, updateEnquiryStatus);
router.delete("/:id", protect, isAdmin, deleteEnquiry);

export default router;
