import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js"
import { Apierror as ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { Apiresponse } from "../utils/Apiresponse.js"
const registerUser = asyncHandler(
    async (req, res) => {
        // Take input from frontend
        // validation - empty or not
        // check if user alredy exist - based on email and username
        // check for images, check for avatar
        // upload them to cloudinary
        // create user object - create entry in db
        // remove password and refresh token feild from response
        // check for user creation based on response
        // return response
        const {
            fullName,
            username,
            email,
            password
        } = req.body

        console.log(req.body);

        if (
            [fullName, email, username, password].some((field) => field?.trim() === "")
        ) {
            throw new ApiError(
                400, "All Fields are Required"
            )
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new ApiError(400, "Invalid Email");
        }

        const existeduser = await User.findOne({
            $or: [{ username }, { email }]
        })

        if (existeduser) {
            throw new ApiError(409, `User with UserName: ${username} or Email: ${email} already exist`)
        }

        console.log(req.files);
        const avatarLocalPath = req.files?.avatar[0]?.path;

        let coverImageLocalPath;
        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.lenght > 0) {
            const coverImageLocalPath = req.files.coverImage[0].path;
        }

        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is required")
        }
        const avataruploadResponse = await uploadOnCloudinary(avatarLocalPath)
        const coveruploadResponse = await uploadOnCloudinary(coverImageLocalPath)
        console.log(avataruploadResponse);
        console.log(coveruploadResponse);

        if (!avataruploadResponse) {
            throw new ApiError(400, "Avatar file is required")
        }

        const user = await User.create({
            fullName,
            username: username.toLowerCase(),
            email,
            password,
            avatar: avataruploadResponse.url,
            coverImage: "" || coveruploadResponse?.url
        });
        console.log(user);

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registeing User")
        }

        console.log("Created User", createdUser);

        return res.status(201).json(
            new Apiresponse(200, createdUser, "User created successfully")
        )
    }
);

export { registerUser }