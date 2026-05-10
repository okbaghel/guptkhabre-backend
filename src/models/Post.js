import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    heading: {
      type: String,
      trim: true,
    },

    subheading: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    mediaUrl: {
      type: String,
      required: true,
    },

    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },

    likes: {
      type: Number,
      default: 0,
    },

    likedBy: [
      {
        ip: String,
        userAgent: String,
      },
    ],

    views: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ views: -1 });   // for "most viewed" admin queries

export default mongoose.model("Post", postSchema);