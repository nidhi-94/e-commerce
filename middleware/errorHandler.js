export const errorHandler = (err, req, res, next) => {
    console.error("Error:", err.stack);
    res.status(500).json({message: err.message || "Internal server error",
    stack: process.env.NODE_ENV === "production" ? null: err.stack,
});    
};