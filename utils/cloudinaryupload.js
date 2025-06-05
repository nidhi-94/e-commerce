import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import slugify from "slugify";

export const uploadToCloudinary = (file, folder = "e-commerce products") => {
    return new Promise((resolve, reject) => {
        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);

        const publicId = `${Date.now()}-${slugify(file.originalname.split(".")[0], { lower: true })}`;

        const uploadStream = cloudinary.uploader.upload_stream({
            folder,
            public_id: publicId,
            transformation: [{ width: 800, height: 800, crop: "limit" }],
            resource_type: "image",
        },
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });

        bufferStream.pipe(uploadStream);
    });
};

export const deleteFromCloudinary = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};