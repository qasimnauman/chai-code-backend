import { asyncHandler } from "../utils/asyncHandler.js"
import { Apierror as Apierror } from "../utils/ApiError.js";
import { User } from "../models/users.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { Apiresponse } from "../utils/Apiresponse.js"
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)

        if (!user) {
            throw new Apierror(404, "User not found");
        }
        const generatedAccessToken = user.generateAccessToken()
        const generatedRefreshToken = user.generateRefreshToken()

        // console.log("Access", generatedAccessToken, "\nRefresh", generatedRefreshToken);

        user.refreshToken = generatedRefreshToken
        await user.save({
            validateBeforeSave: false,
        })

        return { generatedAccessToken, generatedRefreshToken }
    } catch (error) {
        console.error("Token Generation Error:", error.message);
        throw new Apierror(500, "Something went wrong while generating refresh and access token")
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
            throw new Apierror(
                400, "All Fields are Required"
            )
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Apierror(400, "Invalid Email");
        }

        const existeduser = await User.findOne({
            $or: [{ username }, { email }]
        })

        if (existeduser) {
            throw new Apierror(409, `User with UserName: ${username} or Email: ${email} already exist`)
        }

        console.log(req.files);
        const avatarLocalPath = req.files?.avatar[0]?.path;

        let coverImageLocalPath;
        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.lenght > 0) {
            const coverImageLocalPath = req.files.coverImage[0].path;
        }

        if (!avatarLocalPath) {
            throw new Apierror(400, "Avatar file is required")
        }
        const avataruploadResponse = await uploadOnCloudinary(avatarLocalPath)
        const coveruploadResponse = await uploadOnCloudinary(coverImageLocalPath)
        console.log(avataruploadResponse);
        console.log(coveruploadResponse);

        if (!avataruploadResponse) {
            throw new Apierror(400, "Avatar file is required")
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
            throw new Apierror(500, "Something went wrong while registeing User")
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

        const { username, password, email } = req.body

        if ([username, password, email].some((field) => field?.trim() === "")) {
            throw new Apierror(400, "Username/Email and Password are required")
        }

        const user = await User.findOne({
            $or: [{ username }, { email }]
        })
        // console.log("User Check ", user);

        if (!user) {
            throw new Apierror(404, "User is not registered")
        }

        const passwordcheck = await user.isPasswordCorrect(password);

        if (!passwordcheck) {
            throw new Apierror(401, "Invalid User Credentials\nPassword is not correct")
        }

        const { generatedAccessToken, generatedRefreshToken } = await generateAccessAndRefreshToken(user._id);

        // console.log("Access", generatedAccessToken, "Refresh", generatedRefreshToken);

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
    }
);

const logoutUser = asyncHandler(
    async (req, res) => {
        // console.log("\n\n Logout User \n\n");
        // Clear Refresh Token
        // Clear Cookies

        if (!req.user) {
            return res.status(400).json(new Apiresponse(400, {}, "No user is logged in"));
        }

        await User.findByIdAndUpdate(
            req.user._id,
            {
                $unset: {
                    refreshToken: 1 // this removes the field from document
                }
            },
            {
                new: true
            }
        );

        const Options = {
            httpOnly: true,
            secure: true,
            maxAge: 0
        }

        return res.status(200)
            .cookie("accessToken", "", Options)
            .cookie("refreshToken", "", Options)
            .json(
                new Apiresponse(
                    200, {}, "User Logged Out"
                )
            )
    }
);

const refreshAccessToken = asyncHandler(
    async (req, res) => {
        const incomingrefreshToken = req.cookies.refreshToken || req.body.refreshToken

        if (!incomingrefreshToken) {
            throw new Apierror(401, "Unauthorized Request")
        }

        try {
            const decodedtoken = jwt.verify(incomingrefreshToken, process.env.REFRESH_TOKEN_SECRET)

            const user = await User.findById(decodedtoken?._id);

            if (!user) {
                throw new Apierror(400, "User Not Found")
            }

            if (incomingrefreshToken !== user?.refreshToken) {
                throw new Apierror(401, "Refresh token expired or used")
            }

            const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);

            const options = {
                httpOnly: true,
                // maxAge: 24 * 60 * 60 * 1000,
                secure: true,
            }

            return res.status(200)
                .cookie("accessToken", accessToken, Options)
                .cookie("refreshToken", newRefreshToken, Options)
                .json(
                    new Apiresponse(
                        200, {
                        accessToken,
                        refreshToken: newRefreshToken,
                    },
                        "Access Token Refreshed"
                    )
                )
        } catch (error) {
            throw new Apierror(401, error?.message || "Invalid Refresh Token")
        }
    }
);

const changeUserCurrentPassword = asyncHandler(
    async (req, res) => {
        const { oldpassword, newpassword } = req.body;

        // if (!(oldpassword === confirmpassword)) {
        //     throw new Apierror(401, "Passwords are not correct")
        // }

        const user = await User.findById(req.user?._id)
        const isPasswordCorrect = await user.isPasswordCorrect(oldpassword);

        if (!isPasswordCorrect) {
            throw new Apierror(400, "Invalid Passowrd")
        }

        user.password = newpassword;

        await user.save({
            validateBeforeSave: false
        })

        return req.status(200)
            .json(
                new Apiresponse(
                    200,
                    {},
                    "Password Changed Successfully"
                )
            )
    }
);

const getCurrectUser = asyncHandler(
    async (req, res) => {
        return res.status(200)
            .json(
                new Apiresponse(
                    200,
                    req.user,
                    "Current User Fetched Successfully"
                )
            )
    }
);

const upadateUserAccountDetails = asyncHandler(
    async (req, res) => {
        const {
            fullName,
            email
        } = req.body

        if ([fullName, email].some((feild) => feild?.trim() === "")) {
            throw new Apierror(400, "All feilds are required")
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    fullName,
                    email: email
                }
            },
            {
                new: true
            }
        ).select("-password")

        return res.status(200)
            .json(
                new Apiresponse(
                    200,
                    user,
                    "Account Details Updated Successfully"
                )
            )
    }
);

const updateAvatar = asyncHandler(
    async (req, res) => {
        const avatarLocalPath = req.file?.path;
        console.log("\n", avatarLocalPath)

        if (!avatarLocalPath) {
            throw new Apierror(400, "Avatar file is Missing")
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath);
        console.log("\n", avatar)

        if (!avatar) {
            throw new Apierror(400, "Error Uploading Avatar")
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    avatar: avatar.url
                }
            },
            { new: true }
        ).select("-password")

        return res.status(200)
            .json(
                new Apiresponse(
                    200,
                    user,
                    "Successfully Updated Avatar"
                )
            )
    }
);

const updateCoverImage = asyncHandler(
    async (req, res) => {
        const coverImageLocalPath = req.file?.path;
        console.log("\n", coverImageLocalPath)

        if (!coverImageLocalPath) {
            throw new Apierror(400, "Cover Image file is Missing")
        }

        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        console.log("\n", coverImage)

        if (!coverImage) {
            throw new Apierror(400, "Error Uploading Cover Image")
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    coverImage: coverImage.url
                }
            },
            { new: true }
        ).select("-password")

        return res.status(200)
            .json(
                new Apiresponse(
                    200,
                    user,
                    "Cover Image Updated Successfully"
                )
            )
    }
);

const getUserChannelProfile = asyncHandler(
    async (req, res) => {
        const { username } = req.params;

        // Check if username is valid
        if (!username || !username.trim()) {
            throw new Apierror(400, "User not found");
        }

        const channel = await User.aggregate([
            {
                $match: {
                    username: username.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions", // Ensure the collection name is correct
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup: {
                    from: "subscriptions", // Ensure the collection name is correct
                    localField: "_id",
                    foreignField: "subscriber", // Fixed field reference
                    as: "subscribedTo"
                }
            },
            {
                $addFields: {
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    channelSubscribedTo: {
                        $size: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: {
                                $in: [
                                    req.user?._id,
                                    { $map: { input: "$subscribers", as: "sub", in: "$$sub.subscriber" } }
                                ]
                            },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    fullName: 1,
                    username: 1,
                    subscribersCount: 1,
                    channelSubscribedTo: 1,
                    isSubscribed: 1,
                    coverImage: 1,
                    avatar: 1,
                    email: 1
                }
            }
        ]);

        console.log(channel);

        if (!channel?.length) {
            throw new Apierror(404, "Channel does not exist");
        }

        return res.status(200)
            .json(
                new Apiresponse(
                    200,
                    channel[0],
                    "User Channel Fetched Successfully"
                )
            )
    }
);

const getUserWatchHistory = asyncHandler(
    async (req, res) => {
        const user = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchhistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ])

        if (!user?.length) {
            throw new Apierror(
                404,
                "User Not Found"
            )
        }

        return res.status(200)
            .json(
                new Apiresponse(
                    200,
                    user[0].watchhistory,
                    "Watch History Fetched Successfully"
                )
            )
    }
);


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeUserCurrentPassword,
    getCurrectUser,
    upadateUserAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getUserWatchHistory
}