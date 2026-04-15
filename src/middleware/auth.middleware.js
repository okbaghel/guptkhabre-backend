import { verifyToken } from "../utils/jwt.js";

export const protect = (req, res, next) => {
  let token;

  // 1. from header
  if (req.headers.authorization?.startsWith("Bearer ")) {
  token = req.headers.authorization.split(" ")[1];
} else if (req.cookies.token) {
  token = req.cookies.token;
}

  if (!token) {
    return res.status(401).json({ msg: "Not authorized" });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ msg: "Invalid token" });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ msg: "Admin only access" });
  }
  next();
};



