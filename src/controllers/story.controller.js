import Story from "../models/Story.js";
import imagekit from "../services/storage.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// 🔥 CREATE STORY (ADMIN)
export const createStory = asyncHandler(async (req, res) => {
  const { link, caption, mediaType, expiresInHours } = req.body;

  if (!req.file) {
    return res.status(400).json({ msg: "Media is required" });
  }

  if (!mediaType) {
    return res.status(400).json({ msg: "mediaType is required (image/video)" });
  }

  // 🔥 Upload to ImageKit
  const result = await imagekit.upload({
    file: req.file.buffer,
    fileName: `${Date.now()}-${req.file.originalname}`,
    folder: "/stories",
  });

  // 🔥 Expiry time (default 24h)
  const hours = expiresInHours ? Number(expiresInHours) : 24;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  // 🔥 SAVE fileId (IMPORTANT)
  const story = await Story.create({
    mediaUrl: result.url,
    fileId: result.fileId, // ✅ MUST
    mediaType,
    link,
    caption,
    expiresAt,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    story,
  });
});


// 🔥 GET ALL ACTIVE STORIES (PUBLIC)
export const getStories = asyncHandler(async (req, res) => {
  const now = new Date();

  const stories = await Story.find({
    isActive: true,
    expiresAt: { $gt: now },
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    stories,
  });
});


// 🔥 DELETE STORY (ADMIN)
export const deleteStory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const story = await Story.findById(id);

  if (!story) {
    return res.status(404).json({ msg: "Story not found" });
  }

  // 🔥 DELETE FROM IMAGEKIT (FIXED)
  try {
    if (story.fileId) {
      await imagekit.deleteFile(story.fileId);
    }
  } catch (err) {
    console.log("ImageKit delete error:", err.message);
  }

  await story.deleteOne();

  res.json({
    success: true,
    msg: "Story deleted successfully",
  });
});