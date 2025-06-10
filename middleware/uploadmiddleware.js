import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    console.log("File received:", {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
    });
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPEG, JPG, PNG, WEBP & SVG files are allowed."), false);
    }
};

const limits = {
    fileSize: 5 * 1024 * 1024,
};

const upload = multer({
    storage,
    fileFilter,
    limits,
});

export const uploadSingleIcon = async (req, res, next) => {
    const singleUpload = upload.single("icon");

    singleUpload(req, res, (err) => {
        if (err) {
            console.error("Multer error:", err.message);
            if(err instanceof multer.MulterError) {
                if(err.code === "UNEXPECTED_FIELD") {
                return res.status(400).json({ message: err.message });
            }
            if(err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ message: "File size exceeds the limit of 5MB." });
            }
        }
            return res.status(400).json({ message: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ message: "Icon image is required." });
        }
        console.log("File uploaded successfully:", req.file);
        next();
    });
}

export const uploadOptionalIcon = (req, res, next) => {
    const singleUpload = upload.single("icon");
    
    singleUpload(req, res, (error) => {
        if (error) {
            console.error("Multer error:", error);
            if (error instanceof multer.MulterError && error.code === 'UNEXPECTED_FIELD') {
                console.log("No file uploaded for update, continuing...");
                return next();
            }
            return res.status(400).json({ 
                message: error.message || "File upload error" 
            });
        }
        next();
    });
};

export default upload;