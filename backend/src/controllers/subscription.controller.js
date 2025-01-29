import { asyncHandler } from "../utils/asyncHandler.js";
import { Apierror as ApiError } from "../utils/ApiError.js";
import { User } from "../models/users.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Apiresponse as ApiResponse } from "../utils/Apiresponse.js";
import mongoose from "mongoose"

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

        const channel = await User.findOne({
            username: channelId
        }).select("_id");

        // console.log(
        //     "channel: ", channel._id
        // )

        // const subss = await Subscription.find({
        //     channel: channel._id
        // })

        // console.log(subss);

        const subscriberList = await Subscription.aggregate([
            {
                $match: {
                    channel: channel._id
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "subscriber",
                    foreignField: "_id",
                    as: "subscriber",
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                avatar: 1,
                                fullName: 1,
                                createdAt: 1,
                            }
                        },
                    ]
                }
            },
            {
                $project: {
                    _id: 0,
                    username: "$subscriber.username",
                    avatar: "$subscriber.avatar",
                    fullName: "$subscriber.fullName",
                    createdAt: "$subscriber.createdAt",
                }
            }
        ])

        // console.log("list", subscriberList);

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

const getSubscribedChannels = asyncHandler(
    async (req, res) => {
        const { subscriberId } = req.params;

        if (!subscriberId?.trim()) {
            throw new ApiError(
                401,
                "Subscriber ID Required"
            )
        }

        // const channel = await Subscription.find({
        //     subscriber: subscriberId
        // }).select("_id");

        // console.log(channel);

        const channelListSubscriber = await User.aggregate([
            {
                $match: {
                    username: subscriberId.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedchannels",
                    pipeline: [
                        {
                            $project: {
                                _id: 0,
                                subscriber: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "subscribedchannels.subscriber",
                    foreignField: "_id",
                    as: "subscriberdetails",
                    pipeline: [
                        {
                            $project: {
                                _id: 0,
                                username: 1,
                                avatar:1,
                                fullName:1,
                                createdAt: 1
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    _id: 0,
                    username: "$subscriberdetails.username",
                    avatar: "$subscriberdetails.avatar",
                    fullName: "$subscriberdetails.fullName",
                    createdAt: "$subscriberdetails.createdAt"
                }
            }
        ])

        // console.log("channel", channelListSubscriber)

        if (!channelListSubscriber) {
            throw new ApiError(
                404,
                "No Channels Subscribed"
            )
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    channelListSubscriber,
                    "Subscribed Channel List Fetched Successfully"
                )
            )
    }
);

export {
    addNewSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
};