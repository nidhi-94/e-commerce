import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/usermodel.js";
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
    req.user = { _id: decoded.userId, role: decoded.role };
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

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if(!authHeader || !authHeader.startsWith("Bearer ")){
    return res.status(401).json({message: "unauthorized access."});
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if(!user){
      return res.status(201).json({message: "User not found."});
    }

  req.user = { _id: user._id, role: user.role };
    next();
  } catch (error) {
    res.status(401).json({message: "Invalid or expired token.", error: error.message})
  }
}