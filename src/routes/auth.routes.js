import express from "express";
import { login, changePassword , getMe } from "../controllers/auth.controller.js";
import { protect, isAdmin } from "../middleware/auth.middleware.js";


const router = express.Router();

// Admin login
router.post("/login", login);

router.get("/me",protect, isAdmin ,getMe);
// Change password (admin only)
router.put("/change-password", protect, isAdmin, changePassword);

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

export default router;