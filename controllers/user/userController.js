import User from "../../models/usermodel.js";
import Order from "../../models/ordermodel.js";
import bcrypt from "bcryptjs";
import { deleteFromCloudinary, uploadToCloudinary } from "../../utils/cloudinaryupload.js";
import { sendEmail } from "../../utils/sendEmail.js";
import jwt from "jsonwebtoken";

export const getUserProfile = async (req, res) => {
    try {
        console.log("[getUserProfile] User ID:", req.user.userId);
        const user = await User.findById(req.user.userId).select("-password -refreshToken -__v");

        if (!user) {
            console.warn("[GET PROFILE] User not found.");
            return res.status(404).json({ message: "User not found." });
        }
        console.log("[GET PROFILE] User found:", user.email);

        res.json({
            fullName: user.name,
            email: user.email,
            mobile: user.mobile || "",
            dateOfBirth: user.dob ? user.dob.toISOString().split("T")[0] : null,
            gender: user.gender || "",
            location: user.location || {},
            profilePic: user.profilePic || "",
            joinedOn: user.joinedOn,
        });

    } catch (error) {
        console.error("[GET PROFILE] Error:", error);
        res.status(500).json({ message: "Failed to load profile.", error: error.message });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        // const userId = req.user.userId;
        // console.log("[UPDATE PROFILE] Request received for user ID:", req.user.userId);

        console.log("Full req.body:", req.body);

        const user = await User.findById(req.user.userId);
        if (!user) {
            console.log("User not found for ID:", req.user.userId);
            return res.status(404).json({ message: "User not found" });
        }

        const { name, email, password, mobile, dob, gender, city, state, country } = req.body;
        console.log("[UPDATE PROFILE] Incoming Data:", req.body);

        if (name) user.name = name;
        if (email) user.email = email;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            console.log("[UPDATE PROFILE] Password updated.");
        }
        if (mobile) {
            if (!/^[6-9]\d{9}$/.test(mobile)) {
                return res.status(400).json({ message: "Invalid mobile number." });
            }
            user.mobile = mobile;
        }
        if (dob) {
            console.log("[UPDATE PROFILE] Raw DOB:", dob);
            const [day, month, year] = dob.split('/');
            const parsedDate = new Date(`${year}-${month}-${day}`);

            if (isNaN(parsedDate)) return res.status(400).json({ message: "Invalid date of birth format." });
            user.dob = parsedDate;
        }

        if (gender) {
            if (!["Male", "Female", "Other"].includes(gender)) {
                return res.status(400).json({ message: "Invalid gender provided." });
            }
            user.gender = gender;
        }

        if (city || state || country) {
            user.location = {
                city: city || user.location.city || "",
                state: state || user.location.state || "",
                country: country || user.location.country || ""
            }
            console.log("[UPDATE PROFILE] Location updated:", user.location);
        }

        if (req.file && req.file.buffer) {
            console.log("[UPDATE PROFILE] File received for upload.");
            if (user.profilePicId) {
                await deleteFromCloudinary(user.profilePicId);
                console.log("Deleted old profile picture from Cloudinary");
            }

            const result = await uploadToCloudinary(req.file, "Profile_Pictures");
            console.log("[UPDATE PROFILE] Uploaded new profile picture:", result.secure_url);
            user.profilePic = result.secure_url;
            user.profilePicId = result.public_id;
            console.log("[UPDATE PROFILE] Uploaded new profile picture:", result.secure_url);
        }

        await user.save();
        console.log("[UPDATE PROFILE] Profile saved successfully.");
        res.json({
            message: "Profile updated",
            user: {
                fullName: user.name,
                email: user.email,
                mobile: user.mobile || "",
                dateOfBirth: user.dob
                    ? `${user.dob.getDate().toString().padStart(2, '0')}/${(user.dob.getMonth() + 1).toString().padStart(2, '0')}/${user.dob.getFullYear()}`
                    : null,
                gender: user.gender || "",
                location: user.location || {},
                profilePic: user.profilePic,
                joinedOn: user.joinedOn,

            }
        });
    } catch (error) {
        console.error("[UPDATE PROFILE] Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const changeUserPassword = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            console.warn("[CHANGE PASSWORD] User not found.");
            return res.status(404).json({ message: "User not found." });
        }

        const { currentPassword, newPassword } = req.body;
        console.log("[CHANGE PASSWORD] Password change request received.");

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            console.warn("[CHANGE PASSWORD] Incorrect current password.");
            return res.status(400).json({ message: "Current password is incorrect." });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        const passwordPolicyMessage = "Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, number, and special character.";

        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ message: passwordPolicyMessage });
        }

        const previouslyUsed = await Promise.all(
            (user.previousPasswords || []).map(prev => bcrypt.compare(newPassword, prev))
        );
        if (previouslyUsed.includes(true)) {
            return res.status(400).json({ message: "You have already used this password. Please choose a new one." });
        }

        const salt = await bcrypt.genSalt(10);

        user.previousPasswords = [...(user.previousPasswords || []), user.password].slice(-5);
        user.password = await bcrypt.hash(newPassword, salt);
        user.refreshToken = null;
        user.passwordChangedHistory.push({
            changedAt: new Date(),
            ip: req.ip || req.headers["x-forwarded-for"] || "Unknown IP"
        });
        await user.save();
        console.log("[CHANGE PASSWORD] Password updated successfully.");

        await sendEmail(user.email, "Password changed successfully", `Hello ${user.name},\n\nYour password has been changed successfully. If you did not make this change, please contact support immediately.\n\nBest regards,\nN & K Team`);

        res.json({ message: "Password updated successfully." });
    } catch (error) {
        console.error("[CHANGE PASSWORD] Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const sendOtpToEmail = async (req, res) => {
    try {
        console.log("Request body received in sendOtpToEmail:", req.body);
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: "USer not found." });
        }

        const email = req.body.email;
        if (!email) return res.status(400).json({ message: "New email is required." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        user.otp = { code: otp, expiresAt };
        user.pendingEmail = email;

        await user.save();
        console.log(`[SEND OTP] OTP ${otp} generated for ${email}`);
        console.log("[SEND OTP] Updated user:", user);

        await sendEmail(email, "Your OTP Code", `Your OTP code is: ${otp}. It is valid for 10 minutes.`);
        res.json({ message: "OTP sent to your email. Please verify within 10 minutes." });
    } catch (error) {
        console.error("[SEND OTP] Error:", error);
        res.status(500).json({ error: error.message });
    }
}

export const verifyOtpAndUpdateEmail = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        const { otp } = req.body;
        console.log("[VERIFY OTP] Verifying OTP for user:", user.email);

        if (!user.otp || user.otp.code !== otp) return res.status(400).json({ message: "Invalid OTP." });

        if (new Date() > user.otp.expiresAt) {
            return res.status(400).json({ message: "OTP has expired. Please request a new one." });
        }

         if (!user.pendingEmail) {
            return res.status(400).json({ message: "No pending email found." });
        }

        console.log("Before save - user.email:", user.email);
        console.log("Before save - user.pendingEmail:", user.pendingEmail);
        console.log("Before save - user.otp:", user.otp);

        user.email = user.pendingEmail;
        user.pendingEmail = null;
        user.otp = undefined;

        await user.save();
        console.log("[VERIFY OTP] Email updated successfully to:", user.email);

          const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_ACCESS_SECRET, 
            { expiresIn: "10m" } 
        );

        return res.json({
            success: true,
            message: "OTP verified. You can now reset your password.",
            token
        });
    } catch (error) {
        console.error("[VERIFY OTP] Error:", error);
        res.status(500).json({ error: error.message });
    }
}

export const getUserOrders = async (req, res) => {
    try {
        console.log("[GET ORDERS] Fetching orders for user:", req.user.userId);
        const orders = await Order.find({ user: req.user.userId }).sort({ createdAt: -1 });
        console.log(`[GET ORDERS] ${orders.length} orders found.`);
        res.json(orders);
    } catch (error) {
        console.error("[GET ORDERS] Error:", error);
        res.status(500).json({ error: error.message });
    }
}

export const setNewPasswordAfterOtp = async (req, res) => {
    try {
        console.log("[SET NEW PASSWORD] Request received.");
        console.log("Headers:", req.headers);
        console.log("Body:", req.body);
        console.log("Authenticated user ID:", req.user?.userId);

        const userId = req.user.userId;
        const { newPassword } = req.body;

        if (!newPassword ){
            return res.status(400).json({ message: "New password is required." });
}

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
            });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found." });
        console.log("User found:", user.email);

        const reused = await Promise.all(
            (user.previousPasswords || []).map(prev => bcrypt.compare(newPassword, prev))
        );
        if (reused.includes(true)) {
            return res.status(400).json({ message: "You’ve already used this password. Choose a new one." });
        }

        const salt = await bcrypt.genSalt(10);
        user.previousPasswords = [...(user.previousPasswords || []), user.password].slice(-5);
        user.password = await bcrypt.hash(newPassword, salt);
        user.refreshToken = null;
        user.otp = undefined;
        user.passwordChangedHistory.push({
            changedAt: new Date(),
            ip: req.ip || req.headers["x-forwarded-for"] || "Unknown IP"
        });

        await user.save();
        console.log("Password changed successfully for user:", user.email);
        
        await sendEmail(user.email, "Password Reset", `Hey ${user.name},\n\nYour password has been changed successfully.\n\nIf this wasn't you, contact support.`);

        res.json({ message: "Password has been reset successfully." });

    } catch (error) {
        console.error("[RESET PASSWORD AFTER OTP] Error:", error);
        res.status(500).json({ error: error.message });
    }
};
