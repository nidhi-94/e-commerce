import express from "express";
import upload from "../middleware/uploadmiddleware.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import slugify from "slugify";

const router = express.Router();

router.post("/upload-multiple", upload.array("image", 5), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No file uploaded." });
    }

    const results = [];
    for (const file of req.files) {
        const fileName = slugify(file.originalname.split(".")[0], { lower: true });
        const publicId = `${Date.now()}-${fileName}`;

        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);

        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream({
                folder: "e-commerce products",
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
        results.push({
            url: result.secure_url,
            public_id: result.public_id,
        });
    }
    res.status(200).json({ uploaded: results });
});

router.delete("/delete-image/:public_id", async (req, res) => {
    try {
        const { public_id } = req.params;
        const result = await cloudinary.uploader.destroy(public_id);
        res.status(200).json({ message: "Image deleted.", result });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete image", details: error });
    }
})
export default router;