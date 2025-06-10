import User from "../models/usermodel.js";
// import Order from "../models/ordermodel.js";
// import Product from "../models/productmodel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { sendEmail } from "../utils/sendEmail.js";
import Token from "../models/tokenmodel.js";
import { generateTokens } from "../utils/token.js";
import hashToken from "../utils/hashToken.js";

dotenv.config();

console.log("JWT_ACCESS_SECRET from env:", process.env.JWT_ACCESS_SECRET);

// const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
// const ACCESS_TOKEN_EXPIRY = "15m";

//REGISTER
export const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: "User already exists." });

        const hashed = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashed, role });
        await user.save();


        const { accessToken, refreshToken } = generateTokens(user, process.env.JWT_ACCESS_SECRET, process.env.JWT_REFRESH_SECRET);
        res.status(201).json({ user: { _id: user._id, name: user.name, email: user.email, role: user.role }, accessToken, refreshToken });
    } catch (error) {
        console.log("Registration error:", error);

        res.status(500).json({ message: "Registration failed", error: error.message });
    }
};

//LOGIN
export const login = async (req, res) => {

    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        console.log("Stored password:", user.password);
        console.log("Entered password:", password);
        const isMatch = await bcrypt.compare(password, user.password);
        console.log("Password match result:", isMatch);

        if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });
        console.log("Logging in user:", user.email, "with role:", user.role);

        const { accessToken, refreshToken } = generateTokens(user, process.env.JWT_ACCESS_SECRET, process.env.JWT_REFRESH_SECRET);

        await Token.create({ user: user._id, token: hashToken(refreshToken), role: user.role });

        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "Lax",
            maxAge: 2 * 24 * 60 * 60 * 1000
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "Lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            message: "Login Successful",
            accessToken,
            refreshToken,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login failed", error: error.message });
    }
};

//ROTATEREFRESH TOKEN
const rotateRefreshToken = async (userId, oldToken, userRole) => {
    const user = await User.findById(userId);
    const { accessToken, refreshToken } = generateTokens(user, process.env.JWT_ACCESS_SECRET, process.env.JWT_REFRESH_SECRET);

    await Token.findOneAndDelete({ user: userId, token: hashToken(oldToken) });

    await Token.create({
        user: userId,
        token: hashToken(refreshToken),
        role: userRole,
    });

    return { accessToken, refreshToken };
};

//REFRESH TOKENS
export const refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    const ip = req.ip;
    if (!refreshToken) return res.status(401).json({ message: "Missing refresh token." });

    try {
        const hashedToken = hashToken(refreshToken);
        const existingToken = await Token.findOne({ token: hashedToken });
        if (!existingToken) {
            console.warn("Possible token reuse attempt detected.");
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        await existingToken.deleteOne();

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await rotateRefreshToken(user._id, refreshToken, user.role);

        res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: 2 * 24 * 60 * 60 * 1000
        });

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
        res.status(403).json({ message: "Refresh failed", error: error.message });
    }
}

//LOG-OUT END-POINT
export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token is missing." })
        };
        const hashedToken = hashToken(refreshToken);
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const userId = decoded.userId;

        await Token.findOneAndDelete({ token: hashedToken });
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        res.json({ message: "Logged out successfully." })

    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: "Logout failed", error: error.message });
    }
}

//FORGOT-PASS
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        console.log("received forgot password for:", email);


        const user = await User.findOne({ email });
        if (!user) {
            console.log("user not found");
            return res.status(400).json({ message: "User not found." });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_ACCESS_SECRET, { expiresIn: "1h" });
        console.log("password rest token:", token);

        const decoded = jwt.decode(token);
        console.log(decoded.exp);

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
        console.log("Generated reset link:", resetLink);
        await sendEmail(
            email,
            "Reset Your Password", `Click to reset: ${resetLink}`
        );
        res.status(200).json({ message: "Reset password link sent successfully to your email." });

    } catch (error) {
        console.error("Error in forgotPassword:", error);
        res.status(500).json({ message: "Failed to send email. Please try again later.", error: error.message });
    }
};

//RESET-PASS        
export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    console.log("Reset Password called");
    console.log("Received token:", token);
    console.log("Received newPassword:", newPassword ? "Yes" : "No");

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        console.log("Decoded:", decoded);

        const user = await User.findById(decoded.userId);
        if (!user) {
            console.log("User not found for decoded userId:", decoded.userId);
            return res.status(400).json({ message: "Invalid token or user not found." });
}
        if (!newPassword || newPassword.length < 8) {
            console.log("Password validation failed. Length:", newPassword ? newPassword.length : 0);
            return res.status(400).json({ message: "Password must contain atleast 8 characters." })
        }
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        console.log("Password reset successfully for user:", user.email);

        const { accessToken, refreshToken } = generateTokens(user, process.env.JWT_ACCESS_SECRET, process.env.JWT_REFRESH_SECRET);
        await Token.create({ user: user._id, token: hashToken(refreshToken), role: user.role });
        console.log("Generated and stored new tokens");

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 2 * 24 * 60 * 60 * 1000
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            message: "Password has been reset successfully.",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Error in resetPassword:", error);
        return res.status(400).json({ message: "Invalid or expired token." });
    }
};