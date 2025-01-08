// Verifies if the user is logged in or not

import { JWT } from "jsonwebtoken";
import { Apierror } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/users.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            throw new Apierror(404, "Unauthorized Request");
        }

        const decoded = JWT.verify(token, process.env.SECRET_KEY);

        const user = await User.findById(decoded._id).select(
            "-password -refreshToken"
        )

        if (!user) {
            throw new Apierror(401, "Invalid Access Token")
        }

        req.user = user;
        next()
    } catch (error) {
        throw new Apierror(401, error?.message || "Invalid Access Token")
    }
});