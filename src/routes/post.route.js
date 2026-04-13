import express from "express";
import {
  getPosts,
  createPost,
  likePost,
  updatePost,
  deletePost
} from "../controllers/post.controller.js";

import { protect, isAdmin } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";



const router = express.Router();

// Public feed
router.get("/", getPosts);

// Admin upload (matches your UI)
router.post("/", protect, isAdmin, upload.single("file"), createPost);

// Update post
router.put("/:id", protect, isAdmin, upload.single("file"), updatePost);

// Delete post
router.delete("/:id", protect, isAdmin, deletePost);

// Like
router.post("/:id/like", likePost);

export default router;