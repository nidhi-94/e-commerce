import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const requireAuth = (req, res, next) => {
  console.log("Verifying with secret:", process.env.JWT_ACCESS_SECRET);
  try {
    const token = req.cookies.accessToken || req.headers.authorization?.split(" ")[1];
    console.log("Recieved token:", token);
    if (!token) {
      console.log("No token found");
      return res.status(401).json({ message: "unauthorized" });
    }
      
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    console.log("Decoded token in middleware:", decoded);
    req.user = {userId: decoded.userId, role: decoded.role};
    console.log("Decoded token:", decoded);
    console.log("Checking admin middleware for user:", req.user);
    next();
  } catch (error) {
    console.log("JWT error:", error);
    return res.status(401).json({ message: "Token expired or invalid." });
  }
};

export const requireAdmin = (req, res, next) => {
  if(!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden Admins only."})
  }
  next();
};

export const requireUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  if (req.user.role !== "USER") return res.status(403).json({ message: "User only" });
  next();
}