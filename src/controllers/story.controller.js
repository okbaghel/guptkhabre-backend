import Story from "../models/Story.js";
import imagekit from "../services/storage.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import { withCache, cacheDel } from "../lib/cache.js";

const STORIES_KEY = "stories:active";
// Short TTL — stories are time-sensitive and auto-expire via MongoDB TTL index.
// 30 s means a newly-posted story appears within half a minute for all users.
const STORIES_TTL = 30;

// ── Public ────────────────────────────────────────────────────────────────────

export const getStories = asyncHandler(async (req, res) => {
  const stories = await withCache(STORIES_KEY, STORIES_TTL, () => {
    const now = new Date();
    return Story.find({ isActive: true, expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .lean();
  });

  res.json({ success: true, stories });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

export const createStory = asyncHandler(async (req, res) => {
  const { link, caption, mediaType, expiresInHours } = req.body;

  if (!req.file)    return res.status(400).json({ msg: "Media is required" });
  if (!mediaType)   return res.status(400).json({ msg: "mediaType is required (image/video)" });

  const result = await imagekit.upload({
    file:     req.file.buffer,
    fileName: `${Date.now()}-${req.file.originalname}`,
    folder:   "/stories",
  });

  const hours     = expiresInHours ? Number(expiresInHours) : 24;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  const story = await Story.create({
    mediaUrl:  result.url,
    fileId:    result.fileId,
    mediaType,
    link,
    caption,
    expiresAt,
    createdBy: req.user._id,
  });

  await cacheDel(STORIES_KEY);

  res.status(201).json({ success: true, story });
});

export const deleteStory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const story = await Story.findById(id);
  if (!story) return res.status(404).json({ msg: "Story not found" });

  try {
    if (story.fileId) await imagekit.deleteFile(story.fileId);
  } catch (err) {
    console.log("ImageKit delete error:", err.message);
  }

  await story.deleteOne();
  await cacheDel(STORIES_KEY);

  res.json({ success: true, msg: "Story deleted successfully" });
});
