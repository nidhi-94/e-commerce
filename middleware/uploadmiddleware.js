import multer from "multer";

const storage = multer.memoryStorage();

const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];

const fileFilter = (req, file, cb) => {
    console.log("File received:", {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
    });
   
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

const handleUpload = (fieldName, req, res, next, attempts = 0) => {
    console.log(`Attempting to handle upload with field name: ${fieldName} (attempt ${attempts + 1})`);
    console.log('Request headers:', req.headers);
    
    const singleUpload = upload.single(fieldName);
    
    singleUpload(req, res, (err) => {
        if (err) {
            console.error("Multer error details:", {
                message: err.message,
                code: err.code,
                field: err.field,
                storageErrors: err.storageErrors
            });

                if (err.code === "LIMIT_UNEXPECTED_FIELD" && attempts < 1) {
                    const alternativeFieldName = fieldName === "icon" ? "upload" : "icon";
                    console.log(`Trying alternative field name: ${alternativeFieldName}`);
                    return handleUpload(alternativeFieldName, req, res, next, attempts + 1);
                }
                return res.status(400).json({message: err.message, details: "Please ensure you're sending the file with the correct field name (icon or upload)"});
            }
            console.log("File uploaded successful");
            next();
        });
    };

export const uploadSingleIcon = async (req, res, next) => {
    console.log('Starting uploadSingleIcon middleware');
    handleUpload("icon", req, res, (err) => {
        if (err) return next(err);
        if (!req.file) {
            return res.status(400).json({ message: "Icon image is required." });
        }
        console.log("File uploaded successfully:", {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
        next();
    });
};

export const uploadOptionalIcon = (req, res, next) => {
    console.log('Starting uploadOptionalIcon middleware');
    handleUpload("icon", req, res, (err) => {
        if (err) {
            if (err.message.includes("No file uploaded")) {
                console.log('No file uploaded, continuing...');
                return next();
            }
            return res.status(400).json({ 
                message: err.message,
                details: "Please ensure you're sending the file with the correct field name (icon or upload)"
            });
        }
        console.log('Optional upload successful, proceeding to next middleware');
        next();
    });
};

export default upload;