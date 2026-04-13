import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    mediaUrl: {
      type: String,
      required: true,
    },

    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    fileId: {
  type: String,
  required: true,
},

    link: {
      type: String, // optional clickable URL
      default: null,
    },

    caption: {
      type: String,
      default: "",
      required:true,
    },

    expiresAt: {
      type: Date,
      required: true, // Instagram-style expiry
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// auto-delete expired stories (MongoDB TTL index)
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Story = mongoose.model("Story", storySchema);

export default Story;