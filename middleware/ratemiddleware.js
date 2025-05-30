import rateLimit from "express-rate-limit";

export const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "To many Refresh attempts. Try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});