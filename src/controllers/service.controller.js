import Service from "../models/Service.js";
import imagekit from "../services/storage.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import { extractFileId } from "../utils/extractFileId.js";
import { withCache, cacheDel } from "../lib/cache.js";

const SERVICES_KEY = "services:all";
const SERVICES_TTL = 120; // 2 minutes — services change rarely

// ── Public ────────────────────────────────────────────────────────────────────

export const getServices = asyncHandler(async (req, res) => {
  const services = await withCache(SERVICES_KEY, SERVICES_TTL, () =>
    Service.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean()
  );

  res.json({ success: true, services });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

export const createService = asyncHandler(async (req, res) => {
  const { name, profile, description, mobile, whatsapp } = req.body;

  if (!name || !profile || !description || !mobile || !whatsapp) {
    return res.status(400).json({ msg: "All fields are required" });
  }
  if (!req.file) return res.status(400).json({ msg: "Image is required" });

  const result = await imagekit.upload({
    file:     req.file.buffer,
    fileName: `${Date.now()}-${req.file.originalname}`,
    folder:   "/services",
  });

  const service = await Service.create({
    name, profile, description, mobile, whatsapp,
    imageUrl:  result.url,
    createdBy: req.user._id,
  });

  await cacheDel(SERVICES_KEY);

  res.status(201).json({ success: true, service });
});

export const updateService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const service = await Service.findById(id);
  if (!service) return res.status(404).json({ msg: "Service not found" });

  const { name, profile, description, mobile, whatsapp, isActive } = req.body;

  if (name)                      service.name        = name;
  if (profile)                   service.profile     = profile;
  if (description)               service.description = description;
  if (mobile)                    service.mobile      = mobile;
  if (whatsapp)                  service.whatsapp    = whatsapp;
  if (typeof isActive !== "undefined") service.isActive = isActive;

  if (req.file) {
    try {
      const fileId = extractFileId(service.imageUrl);
      if (fileId) await imagekit.deleteFile(fileId);
    } catch (_) {}

    const result = await imagekit.upload({
      file:     req.file.buffer,
      fileName: `${Date.now()}-${req.file.originalname}`,
      folder:   "/services",
    });
    service.imageUrl = result.url;
  }

  await service.save();
  await cacheDel(SERVICES_KEY);

  res.json({ success: true, service });
});

export const deleteService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const service = await Service.findById(id);
  if (!service) return res.status(404).json({ msg: "Service not found" });

  try {
    const fileId = extractFileId(service.imageUrl);
    if (fileId) await imagekit.deleteFile(fileId);
  } catch (err) {
    console.log("Image delete error:", err.message);
  }

  await service.deleteOne();
  await cacheDel(SERVICES_KEY);

  res.json({ success: true, msg: "Service deleted successfully" });
});
