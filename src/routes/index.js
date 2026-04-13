import express from "express";
import authRoutes from "./auth.routes.js";
import postRoutes from "./post.route.js";
import serviceRoutes from "./service.route.js";
import storyRoutes from "./story.route.js"
import enquiryRoutes from "./enquiry.route.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/posts", postRoutes);
router.use("/services", serviceRoutes);
router.use("/stories",storyRoutes);
router.use("/contact",enquiryRoutes);

export default router;