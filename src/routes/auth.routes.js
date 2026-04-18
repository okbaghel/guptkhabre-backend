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
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    partitioned: isProduction,
    path: "/",
  });
  res.json({ success: true });
});

export default router;