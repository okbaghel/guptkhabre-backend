import express from "express";
import {
  createStory,
  getStories,
  deleteStory,
} from "../controllers/story.controller.js";

import { protect, isAdmin } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

// 🔥 PUBLIC
router.get("/", getStories);

// 🔥 ADMIN
router.post("/", protect, isAdmin, upload.single("file"), createStory);
router.delete("/:id", protect, isAdmin, deleteStory);

export default router;