import Service from "../models/Service.js";
import imagekit from "../services/storage.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import { extractFileId } from "../utils/extractFileId.js";


// 🔥 CREATE SERVICE (ADMIN)
export const createService = asyncHandler(async (req, res) => {
  const { name, profile, description, mobile, whatsapp } = req.body;

  if (!name || !profile || !description || !mobile || !whatsapp) {
    return res.status(400).json({ msg: "All fields are required" });
  }

  if (!req.file) {
    return res.status(400).json({ msg: "Image is required" });
  }

  // Upload image
  const result = await imagekit.upload({
    file: req.file.buffer,
    fileName: `${Date.now()}-${req.file.originalname}`,
    folder: "/services",
  });

  const service = await Service.create({
    name,
    profile,
    description,
    mobile,
    whatsapp,
    imageUrl: result.url,
    
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    service,
  });
});


// 🔥 GET ALL SERVICES (PUBLIC)
export const getServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ isActive: true })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    services,
  });
});


// 🔥 UPDATE SERVICE (ADMIN)
export const updateService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const service = await Service.findById(id);

  if (!service) {
    return res.status(404).json({ msg: "Service not found" });
  }

  const { name, profile, description, mobile, whatsapp, isActive } = req.body;

  if (name) service.name = name;
  if (profile) service.profile = profile;
  if (description) service.description = description;
  if (mobile) service.mobile = mobile;
  if (whatsapp) service.whatsapp = whatsapp;

  // 🔥 NEW: STATUS UPDATE
  if (typeof isActive !== "undefined") {
    service.isActive = isActive;
  }

  // 🔥 Image update
  if (req.file) {
    try {
      const fileId = extractFileId(service.imageUrl);
      if (fileId) await imagekit.deleteFile(fileId);
    } catch (err) {}

    const result = await imagekit.upload({
      file: req.file.buffer,
      fileName: `${Date.now()}-${req.file.originalname}`,
      folder: "/services",
    });

    service.imageUrl = result.url;
  }

  await service.save();

  res.json({
    success: true,
    service,
  });
});


const getImageKitFileId = async (url) => {
  try {
    // Search ImageKit for the file by URL
    const fileName = url.split("/").pop(); // get filename from URL
    const files = await imagekit.listFiles({ name: fileName, limit: 1 });
    if (files && files.length > 0) return files[0].fileId;
    return null;
  } catch {
    return null;
  }
};


// 🔥 DELETE SERVICE (ADMIN)
export const deleteService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const service = await Service.findById(id);

  if (!service) {
    return res.status(404).json({ msg: "Service not found" });
  }

  // delete image
  try {
    const fileId = extractFileId(service.imageUrl);
    if (fileId) {
      await imagekit.deleteFile(fileId);
    }
  } catch (err) {
    console.log("Image delete error");
  }

  await service.deleteOne();

  res.json({
    success: true,
    msg: "Service deleted successfully",
  });
});