import Post from "../models/Post.js";
import imagekit from "../services/storage.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import { extractFileId } from "../utils/extractFileId.js";




export const getPosts = asyncHandler(async (req, res) => {
  let { page = 1, limit = 5 } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  const skip = (page - 1) * limit;

  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("title mediaUrl mediaType likes createdAt");

  // const total = await Post.countDocuments();

  // res.json({
  //   page,
  //   totalPages: Math.ceil(total / limit),
  //   totalPosts: total,
  //   posts,
  // });
  const hasMore = posts.length === limit;

res.json({
  page,
  hasMore,
  posts,
});
});

// CREATE POST (ADMIN)


export const createPost = asyncHandler(async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ msg: "Title is required" });
  }

  if (!req.file) {
    return res.status(400).json({ msg: "Media file is required" });
  }

  // 🔥 AUTO DETECT TYPE
  const mediaType = req.file.mimetype.startsWith("video")
    ? "video"
    : "image";

  // Upload to ImageKit
  const result = await imagekit.upload({
    file: req.file.buffer,
    fileName: `${Date.now()}-${req.file.originalname}`,
    folder: "/guptkhabre",
  });

  const post = await Post.create({
    title,
    mediaUrl: result.url,
    mediaType,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    post,
  });
});

// LIKE POST
export const likePost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  const post = await Post.findById(id);

  if (!post) {
    return res.status(404).json({ msg: "Post not found" });
  }

  const alreadyLiked = post.likedBy.some(
    (u) => u.ip === ip && u.userAgent === userAgent
  );

  if (alreadyLiked) {
    return res.status(400).json({ msg: "Already liked" });
  }

  post.likes += 1;
  post.likedBy.push({ ip, userAgent });

  await post.save();

  res.json({ likes: post.likes });
});


export const updatePost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  const post = await Post.findById(id);

  if (!post) {
    return res.status(404).json({ msg: "Post not found" });
  }

  // Update title if provided
  if (title) {
    post.title = title;
  }

  // If new file uploaded → replace media
  if (req.file) {
    // 🔥 delete old file from ImageKit
    try {
      const fileId = extractFileId(post.mediaUrl);
      if (fileId) {
        await imagekit.deleteFile(fileId);
      }
    } catch (err) {
      console.log("Old file delete failed:", err.message);
    }

    // Upload new file
    const mediaType = req.file.mimetype.startsWith("video")
      ? "video"
      : "image";

    const result = await imagekit.upload({
      file: req.file.buffer,
      fileName: `${Date.now()}-${req.file.originalname}`,
      folder: "/guptkhabre",
    });

    post.mediaUrl = result.url;
    post.mediaType = mediaType;
  }

  await post.save();

  res.json({
    success: true,
    post,
  });
});


export const deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findById(id);

  if (!post) {
    return res.status(404).json({ msg: "Post not found" });
  }

  // 🔥 delete media from ImageKit
  try {
    const fileId = extractFileId(post.mediaUrl);
    if (fileId) {
      await imagekit.deleteFile(fileId);
    }
  } catch (err) {
    console.log("File delete error:", err.message);
  }

  await post.deleteOne();

  res.json({
    success: true,
    msg: "Post deleted successfully",
  });
});