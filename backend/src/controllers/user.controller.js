import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js"
import { Apierror as ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { Apiresponse } from "../utils/Apiresponse.js"
import { genSalt } from "bcrypt";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const generatedAccessToken = user.generateAccessToken()
        const generatedRefreshToken = user.generateRefreshToken()

        user.refreshToken = generatedRefreshToken
        await user.save({
            validateBeforeSave: false,
        })

        return { generatedAccessToken, generatedRefreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

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

const loginUser = asyncHandler(
    async (req, res) => {
        // Enter UserName/Email and Password from User
        // Check for the Credentials in the DB
        // If Any Credential is not correct then throw error
        // If Found then set the access the token and refresh token
        // Return the User with the access token and refresh token in the form of secure cookies

        const { username, email, password } = req.body

        if ([username, email].some((field) => field?.trim() === "")) {
            throw new ApiError(400, "Username/Email and Password are required")
        }

        const user = await User.findOne({
            $or: [{ username }, { email }]
        })

        if (!user) {
            throw new ApiError(404, "User is not registered")
        }

        const passwordcheck = await user.isPasswordCorrect(password);

        if (!passwordcheck) {
            throw new ApiError(401, "Invalid User Credentials\nPassword is not correct")
        }

        const { generatedAccessToken, generatedRefreshToken } = await generateAccessAndRefreshToken(user._id);

        const loggedInUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )

        const options = {
            httpOnly: true,
            // maxAge: 24 * 60 * 60 * 1000,
            secure: true,
        }

        return res.status(200)
            .cookie("accessToken", generatedAccessToken, options)
            .cookie("refreshToken", generatedRefreshToken, options)
            .json(
                new Apiresponse(
                    200,
                    {
                        user: loggedInUser, generatedAccessToken,
                        generatedRefreshToken
                    },
                    "User logged in successfully"
                )
            )
    });

const logoutUser = asyncHandler(
    async (req, res) => {
        // Clear Refresh Token
        // Clear Cookies
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: { refreshToken: undefined },
            },
            {
                new: true
            }
        );

        const Options = {
            httpOnly: true,
            secure: true
        }

        return res.status(200)
            .cookie("accessToken", options)
            .cookie("refreshToken", options)
            .json(
                new Apiresponse(
                    200, {}, "User Logged Out"
                )
            )
    });

export { registerUser, loginUser, logoutUser }