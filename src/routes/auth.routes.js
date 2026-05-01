import express from "express";
import { login, changePassword, getMe } from "../controllers/auth.controller.js";
import { protect, isAdmin }             from "../middleware/auth.middleware.js";
import { loginLimiter }                 from "../middleware/rateLimiter.js";

const router = express.Router();

// Login (rate-limited: 5 attempts / 15 min per IP — brute-force protection)
router.post("/login", loginLimiter, login);

router.get("/me", protect, isAdmin, getMe);
router.put("/change-password", protect, isAdmin, changePassword);

router.post("/logout", (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly:    true,
    secure:      isProduction,
    sameSite:    isProduction ? "none" : "lax",
    partitioned: isProduction,
    path:        "/",
  });
  res.json({ success: true });
});

export default router;
