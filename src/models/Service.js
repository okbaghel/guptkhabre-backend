import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    profile: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    imageUrl: {
      type: String,
      required: true,
    },
     imageFileId: String,

    mobile: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/,
    },

    whatsapp: {
      type: String,
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index: filter on isActive first (high selectivity), then sort by date
serviceSchema.index({ isActive: 1, createdAt: -1 });

export default mongoose.model("Service", serviceSchema);