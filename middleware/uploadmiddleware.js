import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import pkg from "multer-storage-cloudinary";
import { Error } from "mongoose";
const { CloudinaryStorage } = pkg;


const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => ({
        folder: "e-commerce products",
        allowed_formats: ["jpeg", "jpg", "png", "webp"],
        public_id: `${Date.now()}-${file.originalname}`,
        transformation: [{ width: 800, height: 800, crop: "limit" }],
    }),
});

const fileName = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if(allowedTypes.includes(file.mimetype)){
        cb(null, true);
    } else {
        cb(new Error("Only JPEG, JPG, PNG & WEBP files are allowed."), false);
    }
};

const limits = {
    fileSize: 2 * 1024 * 1024,
};

const upload = multer({
    storage,
    fileFilter: fileName,
    limits,
});

export default upload;