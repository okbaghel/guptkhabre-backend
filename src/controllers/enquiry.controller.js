import Enquiry from "../models/Enquiry.js";
import asyncHandler from "../utils/asyncHandler.js";


// 🔥 CREATE ENQUIRY (PUBLIC)
export const createEnquiry = asyncHandler(async (req, res) => {
  const { name, contact, purpose, message } = req.body;


  // if (!name || !contact || purpose) {
  //   return res.status(400).json({ msg: "Required fields missing" });
  // }

  const enquiry = await Enquiry.create({
    name,
    contact,
    purpose,
    message,
  });

  res.status(201).json({
    success: true,
    enquiry,
  });
});


// 🔥 GET ALL ENQUIRIES (ADMIN)
export const getEnquiries = asyncHandler(async (req, res) => {
  const enquiries = await Enquiry.find({ isActive: true })
    .sort({ createdAt: -1 });
  
  res.json({
    success: true,
    enquiries,
  });
});


// 🔥 UPDATE STATUS (ADMIN)
export const updateEnquiryStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const enquiry = await Enquiry.findById(id);

  if (!enquiry) {
    return res.status(404).json({ msg: "Enquiry not found" });
  }

  if (status) {
    enquiry.status = status;
  }

  await enquiry.save();

  res.json({
    success: true,
    enquiry,
  });
});


// 🔥 DELETE ENQUIRY (ADMIN)
export const deleteEnquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const enquiry = await Enquiry.findById(id);

  if (!enquiry) {
    return res.status(404).json({ msg: "Enquiry not found" });
  }

  await enquiry.deleteOne();

  res.json({
    success: true,
    msg: "Enquiry deleted successfully",
  });
});