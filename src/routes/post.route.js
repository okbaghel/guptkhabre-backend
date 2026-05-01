import express from "express";
import {
  getPosts,
  getPostById,
  createPost,
  likePost,
  updatePost,
  deletePost,
} from "../controllers/post.controller.js";

import { protect, isAdmin }  from "../middleware/auth.middleware.js";
import upload                from "../middleware/upload.middleware.js";
import { likeLimiter }       from "../middleware/rateLimiter.js";

const router = express.Router();

// Public feed
router.get("/",    getPosts);
router.get("/:id", getPostById);

// Admin mutations
router.post("/",    protect, isAdmin, upload.single("file"), createPost);
router.put("/:id",  protect, isAdmin, upload.single("file"), updatePost);
router.delete("/:id", protect, isAdmin, deletePost);

// Like (rate-limited: 10 / min per IP)
router.post("/:id/like", likeLimiter, likePost);

export default router;
