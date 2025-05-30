import jwt from "jsonwebtoken"; 

export const generateTokens = (user, accessSecret, refreshSecret , accessExpiry = "2d", refreshExpiry = "7d") => {
    const accessPayLoad = {
        userId: user._id,
        role: user.role,
        tokenType: "access",
        // iat: Math.floor(Date.now()/ 1000)
    };
    const refreshPayLoad = {
        userId: user._id,
        tokenType: "refresh",
    };
    const accessToken = jwt.sign(accessPayLoad, accessSecret, { expiresIn: accessExpiry });
    const refreshToken = jwt.sign(refreshPayLoad, refreshSecret, { expiresIn: refreshExpiry });
     if (process.env.NODE_ENV !== "production") {
        console.log("Access and refresh tokens generated.");
    }
    return { accessToken, refreshToken };
};
