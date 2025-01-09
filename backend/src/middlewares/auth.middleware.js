// Verifies if the user is logged in or not

import jwt from "jsonwebtoken";
import { Apierror as ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/users.model.js";

export const verifyJWT = asyncHandler(async(req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
        console.log(token);
        if (!token || typeof token !== "string") {
            throw new ApiError(401, "Unauthorized: Token is missing or invalid");
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})