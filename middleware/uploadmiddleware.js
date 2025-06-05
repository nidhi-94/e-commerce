import multer from "multer";

const storage = multer.memoryStorage();

const fileName = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if(allowedTypes.includes(file.mimetype)){
        cb(null, true);
    } else {
        cb(new Error("Only JPEG, JPG, PNG & WEBP files are allowed."), false);
    }
};

const limits = {
    fileSize: 5 * 1024 * 1024,
};

const upload = multer({
    storage,
    fileFilter: fileName,
    limits,
});

export default upload;