import express from "express";
import {
  getPosts,
  getAdminPostsList,
  getPostById,
  createPost,
  likePost,
  trackView,
  updatePost,
  deletePost,
} from "../controllers/post.controller.js";

import { protect, isAdmin }  from "../middleware/auth.middleware.js";
import upload                from "../middleware/upload.middleware.js";
import { likeLimiter }       from "../middleware/rateLimiter.js";

const router = express.Router();

// ── Public ─────────────────────────────────────────────────────────────────────
router.get("/",    getPosts);

// ── Admin list (must be before /:id to avoid "admin" being treated as an id) ──
router.get("/admin/list", protect, isAdmin, getAdminPostsList);

// ── Public: single post ────────────────────────────────────────────────────────
router.get("/:id", getPostById);

// ── Admin mutations ────────────────────────────────────────────────────────────
router.post("/",      protect, isAdmin, upload.single("file"), createPost);
router.put("/:id",    protect, isAdmin, upload.single("file"), updatePost);
router.delete("/:id", protect, isAdmin, deletePost);

// ── Public interactions ────────────────────────────────────────────────────────
router.post("/:id/like", likeLimiter, likePost);
router.post("/:id/view", trackView);          // fire-and-forget; no rate limit needed

export default router;
