import express from "express";
import {
  createService,
  getServices,
  updateService,
  deleteService,
} from "../controllers/service.controller.js";

import { protect, isAdmin } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

// 🔥 PUBLIC
router.get("/", getServices);

// 🔥 ADMIN
router.post("/", protect, isAdmin, upload.single("file"), createService);
router.put("/:id", protect, isAdmin, upload.single("file"), updateService);
router.delete("/:id", protect, isAdmin, deleteService);

export default router;