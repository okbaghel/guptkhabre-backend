import Post from "../models/Post.js";
import imagekit from "../services/storage.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import { extractFileId } from "../utils/extractFileId.js";
import { withCache, cacheDel, cacheDelPattern } from "../lib/cache.js";

// TTLs (seconds)
const TTL_LIST   = 60;  // feed pages — short so new posts appear quickly
const TTL_SINGLE = 300; // individual post — 5 min; invalidated on edit/delete

// ── Public ────────────────────────────────────────────────────────────────────

export const getPosts = asyncHandler(async (req, res) => {
  let { page = 1, limit = 5 } = req.query;
  page  = parseInt(page,  10);
  limit = parseInt(limit, 10);

  const cacheKey = `posts:p${page}:l${limit}`;

  const result = await withCache(cacheKey, TTL_LIST, async () => {
    // Fetch limit+1 to determine hasMore reliably without an extra COUNT query
    const raw = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .select("title heading subheading mediaUrl mediaType likes createdAt")
      .lean(); // plain JS objects — faster JSON serialisation, no Mongoose overhead

    const hasMore = raw.length > limit;
    if (hasMore) raw.pop(); // remove the sentinel item

    return { page, hasMore, posts: raw };
  });

  res.json(result);
});

export const getPostById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ msg: "Invalid post ID" });
  }

  const post = await withCache(`post:${id}`, TTL_SINGLE, () =>
    Post.findById(id)
      .select("title heading subheading description mediaUrl mediaType likes createdAt")
      .lean()
  );

  if (!post) return res.status(404).json({ msg: "Post not found" });

  res.json({ success: true, post });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

export const createPost = asyncHandler(async (req, res) => {
  const { title, heading, subheading, description } = req.body ?? {};

  if (!title)    return res.status(400).json({ msg: "Title is required" });
  if (!req.file) return res.status(400).json({ msg: "Media file is required" });

  const mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";

  const result = await imagekit.upload({
    file:     req.file.buffer,
    fileName: `${Date.now()}-${req.file.originalname}`,
    folder:   "/guptkhabre",
  });

  const post = await Post.create({
    title, heading, subheading, description,
    mediaUrl:  result.url,
    mediaType,
    createdBy: req.user._id,
  });

  // New post invalidates every cached feed page
  await cacheDelPattern("posts:*");

  res.status(201).json({ success: true, post });
});

export const updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, heading, subheading, description } = req.body;

  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ msg: "Post not found" });

  if (title)                   post.title       = title;
  if (heading      !== undefined) post.heading    = heading;
  if (subheading   !== undefined) post.subheading = subheading;
  if (description  !== undefined) post.description = description;

  if (req.file) {
    try {
      const fileId = extractFileId(post.mediaUrl);
      if (fileId) await imagekit.deleteFile(fileId);
    } catch (err) {
      console.log("Old file delete failed:", err.message);
    }

    const mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";
    const result = await imagekit.upload({
      file:     req.file.buffer,
      fileName: `${Date.now()}-${req.file.originalname}`,
      folder:   "/guptkhabre",
    });
    post.mediaUrl  = result.url;
    post.mediaType = mediaType;
  }

  await post.save();

  // Invalidate both the detail cache and every list page
  await Promise.all([
    cacheDel(`post:${id}`),
    cacheDelPattern("posts:*"),
  ]);

  res.json({ success: true, post });
});

export const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ msg: "Post not found" });

  try {
    const fileId = extractFileId(post.mediaUrl);
    if (fileId) await imagekit.deleteFile(fileId);
  } catch (err) {
    console.log("File delete error:", err.message);
  }

  await post.deleteOne();

  await Promise.all([
    cacheDel(`post:${id}`),
    cacheDelPattern("posts:*"),
  ]);

  res.json({ success: true, msg: "Post deleted successfully" });
});

// ── Public (like) ─────────────────────────────────────────────────────────────

export const likePost = asyncHandler(async (req, res) => {
  const { id }    = req.params;
  const ip        = req.ip;
  const userAgent = req.headers["user-agent"];

  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ msg: "Post not found" });

  const alreadyLiked = post.likedBy.some(
    (u) => u.ip === ip && u.userAgent === userAgent
  );
  if (alreadyLiked) return res.status(400).json({ msg: "Already liked" });

  post.likes += 1;
  post.likedBy.push({ ip, userAgent });
  await post.save();

  // Only bust the single-post cache; the feed shows a stale count for ≤60 s
  // which is an acceptable trade-off vs. invalidating every page on every like.
  await cacheDel(`post:${id}`);

  res.json({ likes: post.likes });
});
