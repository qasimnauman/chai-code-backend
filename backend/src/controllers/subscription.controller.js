import { asyncHandler } from "../utils/asyncHandler.js";
import { Apierror as ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Apiresponse as ApiResponse } from "../utils/Apiresponse.js";

const addNewSubscription = asyncHandler(
    async (req, res) => {
        const { channelId } = req.params;

        // Validate channelId
        if (!channelId || !channelId.trim()) {
            throw new ApiError(400, "Channel ID is required");
        }

        // Find the channel by channelId
        const channel = await User.findOne({ username: channelId.trim() }).select("-password -refreshToken");
        if (!channel) {
            throw new ApiError(404, "Channel not found");
        }

        // Validate the logged-in user
        const currentUser = req.user?._id;
        if (!currentUser) {
            throw new ApiError(400, "User not logged in");
        }

        // Check for an existing subscription
        const existingSubscription = await Subscription.findOne({
            subscriber: currentUser,
            channel: channel._id,
        });
        if (existingSubscription) {
            throw new ApiError(400, "You are already subscribed to this channel");
        }

        // Create a new subscription
        let newSubscription;
        try {
            newSubscription = await Subscription.create({
                subscriber: currentUser,
                channel: channel._id,
            });
        } catch (error) {
            throw new ApiError(500, "Error creating subscription");
        }

        console.log("Subscription Created:", newSubscription);

        return res
        .status(201)
        .json(
            new ApiResponse(201, newSubscription, "Subscription added successfully")
        );
    }
);

const getUserChannelSubscribers = asyncHandler(
    async (req, res) => {
        // ChannelId is the username of the channel
        const { channelId } = req.params

        if (!channelId?.trim()) {
            throw new ApiError(400, "Channel ID is required")
        }

        const subscriberList = await Subscription.aggregate([
            {
                $match: {
                    channel: channelId.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "User",
                    localField: "channel",
                    foreignField: "_id",
                    as: "subscriber",
                }
            },
            {
                $project: {
                    username: 1,
                    email: 1,
                    createdAt: 1,
                    avatar: 1
                }
            }
        ])

        if (!subscriberList) {
            throw new ApiError(
                404,
                "No Subscribers Found"
            )
        }

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscriberList,
                "Subscriber List Fetched Successfully"
            )
        )
    }
);

export {
    addNewSubscription,
    getUserChannelSubscribers
};