import sanitizeHtml from "sanitize-html";
import Post from "../models/Post.js";
import imagekit from "../services/storage.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import { extractFileId } from "../utils/extractFileId.js";
import { withCache, cacheDel, cacheDelPattern } from "../lib/cache.js";
import { getRedis } from "../lib/redis.js";

// ── HTML sanitisation config ─────────────────────────────────────────────────
// Allows a rich subset of tags while blocking all script/event-handler vectors.
const SANITIZE_OPTIONS = {
  allowedTags: [
    "h1","h2","h3","h4","h5","h6",
    "p","br","hr",
    "strong","em","u","s","code","mark",
    "ul","ol","li",
    "blockquote","pre",
    "a","img",
    "table","thead","tbody","tr","th","td",
    "div","span",
  ],
  allowedAttributes: {
    a:   ["href","target","rel"],
    img: ["src","alt","width","height","style"],
    "*": ["style","class"],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^(left|right|center|justify)$/],
      "color":       [/.*/],
      "background-color": [/.*/],
    },
  },
  // Force all links to open in a new tab with safe rel
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
  },
};

const sanitize = (html) => sanitizeHtml(html || "", SANITIZE_OPTIONS);

// TTLs (seconds)
const TTL_LIST   = 60;
const TTL_SINGLE = 300;

// ── Public: paginated feed ────────────────────────────────────────────────────

export const getPosts = asyncHandler(async (req, res) => {
  let { page = 1, limit = 5 } = req.query;
  page  = parseInt(page,  10);
  limit = parseInt(limit, 10);

  const cacheKey = `posts:p${page}:l${limit}`;

  const result = await withCache(cacheKey, TTL_LIST, async () => {
    const raw = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .select("title heading subheading mediaUrl mediaType likes views createdAt")
      .lean();

    const hasMore = raw.length > limit;
    if (hasMore) raw.pop();

    return { page, hasMore, posts: raw };
  });

  res.json(result);
});

// ── Admin: paginated list with total count ────────────────────────────────────
// Kept separate so the heavy COUNT query never pollutes the public cached path.

export const getAdminPostsList = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, search = "" } = req.query;
  page  = parseInt(page,  10);
  limit = parseInt(limit, 10);

  const filter = search.trim()
    ? { title: { $regex: search.trim(), $options: "i" } }
    : {};

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("title heading mediaUrl mediaType likes views createdAt createdBy")
      .lean(),
    Post.countDocuments(filter),
  ]);

  res.json({
    posts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// ── Public: single post ───────────────────────────────────────────────────────

export const getPostById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ msg: "Invalid post ID" });
  }

  const post = await withCache(`post:${id}`, TTL_SINGLE, () =>
    Post.findById(id)
      .select("title heading subheading description mediaUrl mediaType likes views createdAt")
      .lean()
  );

  if (!post) return res.status(404).json({ msg: "Post not found" });

  res.json({ success: true, post });
});

// ── Public: track view (deduped per IP per post for 24 h via Redis) ───────────

export const trackView = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ msg: "Invalid post ID" });
  }

  const ip = req.ip || "unknown";
  const redis = getRedis();

  if (redis) {
    const dedupKey = `view:${id}:${ip}`;
    const already  = await redis.get(dedupKey).catch(() => null);
    if (already) return res.json({ success: true, counted: false });
    await redis.set(dedupKey, "1", "EX", 86400).catch(() => {}); // 24 h
  }

  await Post.findByIdAndUpdate(id, { $inc: { views: 1 } });

  // Bust single-post cache so detail page reflects updated view count
  await cacheDel(`post:${id}`);

  res.json({ success: true, counted: true });
});

// ── Admin: create post ────────────────────────────────────────────────────────

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
    title:       title.trim(),
    heading:     heading?.trim()     || undefined,
    subheading:  subheading?.trim()  || undefined,
    description: sanitize(description),   // sanitize rich HTML before storing
    mediaUrl:    result.url,
    mediaType,
    createdBy:   req.user._id,
  });

  await cacheDelPattern("posts:*");

  res.status(201).json({ success: true, post });
});

// ── Admin: update post ────────────────────────────────────────────────────────

export const updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, heading, subheading, description } = req.body;

  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ msg: "Post not found" });

  if (title)                      post.title       = title.trim();
  if (heading      !== undefined)  post.heading    = heading?.trim()    || "";
  if (subheading   !== undefined)  post.subheading = subheading?.trim() || "";
  if (description  !== undefined)  post.description = sanitize(description);

  if (req.file) {
    try {
      const fileId = extractFileId(post.mediaUrl);
      if (fileId) await imagekit.deleteFile(fileId);
    } catch (err) {
      console.log("Old file delete failed:", err.message);
    }

    const mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";
    const result    = await imagekit.upload({
      file:     req.file.buffer,
      fileName: `${Date.now()}-${req.file.originalname}`,
      folder:   "/guptkhabre",
    });
    post.mediaUrl  = result.url;
    post.mediaType = mediaType;
  }

  await post.save();

  await Promise.all([
    cacheDel(`post:${id}`),
    cacheDelPattern("posts:*"),
  ]);

  res.json({ success: true, post });
});

// ── Admin: delete post ────────────────────────────────────────────────────────

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

// ── Public: like post ─────────────────────────────────────────────────────────

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

  await cacheDel(`post:${id}`);

  res.json({ likes: post.likes });
});
