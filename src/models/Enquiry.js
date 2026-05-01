import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    contact: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      enum: [
      "General Inquiry",
      "Expert Consultation",
      "News Tip / Leak",
      "Partnership",
      "Media Enquiry",
      "Other",
    ],
    },

    message: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index: admin list filters isActive then sorts by newest first
enquirySchema.index({ isActive: 1, createdAt: -1 });

const Enquiry = mongoose.model("Enquiry", enquirySchema);

export default Enquiry;