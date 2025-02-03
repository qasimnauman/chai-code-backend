import { asyncHandler } from "../utils/asyncHandler.js";
import { Apierror } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import {
    deletefromCloudinary,
    uploadOnCloudinary
} from "../utils/cloudinary.js";
import mongoose from "mongoose";
import { User } from "../models/users.model.js";
import { Subscription } from "../models/subscription.model.js";

const publishVideo = asyncHandler(
    async (req, res) => {
        const {
            title,
            description,
            isPublished,
            duration
        } = req.body
        // User can publish only one video at a time

        if (
            [title, description].some((feild) => feild?.trim() === "")
        ) {
            throw new Apierror(
                400, "All Feild are Required"
            )
        }

        const videoLocalPath = req.files?.videofile[0]?.path;
        const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

        console.log(videoLocalPath);
        console.log(thumbnailLocalPath);

        if (!videoLocalPath || !thumbnailLocalPath) {
            throw new Apierror(
                400, "Video and Thumbnail is Required"
            )
        }

        const videoUpload = await uploadOnCloudinary(videoLocalPath, req.user?.username, "videos");
        const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath, req.user?.username, "thumbnails");

        if (!videoUpload) {
            throw new Apierror(
                400, "Video Upload Failed"
            )
        }

        if (!thumbnailUpload) {
            throw new Apierror(
                400, "Thumbnail Upload Failed"
            )
        }

        // owner - username - req.user._id
        // title - title
        // description - description
        // duration - input from user
        // thumbnail - from upload
        // videoFile - from upload
        // duration - from User
        // isPublished - from User

        const video = await Video.create({
            owner: req.user._id,
            title: title,
            description: description,
            thumbnail: thumbnailUpload.url,
            videofile: videoUpload.url,
            isPublished: isPublished,
            duration: duration
        })
        console.log(video);

        const newVideo = await Video.findById(video._id).select(
            "-views -watchHistory"
        )

        if (!newVideo) {
            throw new Apierror(
                500,
                "Error Something went wrong while uploading the Video"
            )
        }

        console.log(newVideo);

        return res
            .status(200)
            .json(
                new Apiresponse(
                    200,
                    newVideo,
                    "Video Uploaded Successfully"
                )
            )
    }
)

const getVideoById = asyncHandler(
    async (req, res) => {
        const { videoId } = req.params
        //TODO: get video by id
        if (!videoId) {
            throw new Apierror(
                400, "Video ID is required"
            )
        }

        // const vid = await Video.findById(videoId);
        // console.log(vid);

        const VideoDetails = await Video.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "Owner",
                    pipeline: [
                        {
                            $project: {
                                _id: 0,
                                username: 1,
                                avatar: 1,
                                fullName: 1,
                                createdAt: 1
                            }
                        }
                    ]
                },
            },
            {
                $project: {
                    _id: 1,
                    videofile: 1,
                    thumbnail: 1,
                    description: 1,
                    isPublished: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    views: 1,
                    Owner: 1,
                }
            }
        ])

        if (!VideoDetails) {
            throw new Apierror(
                404, "No Video Found"
            )
        }

        // console.log("VId", VideoDetails)

        return res
            .status(200)
            .json(
                new Apiresponse(
                    200,
                    VideoDetails,
                    "Video Details Fetched Successfully"
                )
            )
    }
)

const deleteVideo = asyncHandler(
    async (req, res) => {
        const { videoId } = req.params
        //TODO: delete video
        if (!videoId) {
            throw new Apierror(
                400,
                "Video ID Required"
            )
        }

        const savedVideo = await Video.findById(videoId);
        // console.log(savedVideo);
        console.log("Video", savedVideo.videofile);
        console.log("Thum", savedVideo.thumbnail);


        deletefromCloudinary(savedVideo.videofile);
        deletefromCloudinary(savedVideo.thumbnail);

        const deleteStatus = await Video.deleteOne({ _id: videoId });

        console.log(deleteStatus);

        return res
            .status(200)
            .json(
                new Apiresponse(
                    200,
                    deleteStatus,
                    "Video Deleted Successfully"
                )
            )
    }
)

const togglePublishStatus = asyncHandler(
    async (req, res) => {
        const { videoId, newStatus } = req.params

        // console.log(videoId);
        // console.log(newStatus);

        if (!videoId) {
            throw new Apierror(
                400, "Video ID Required"
            )
        }

        const publishStatus = await Video.findById(videoId).select("isPublished");
        // console.log(publishStatus);

        if (newStatus === String(publishStatus.isPublished)) {
            throw new Apierror(
                400, `Already ${newStatus === 'true' ? 'Published' : 'Unpublished'}`
            );
        }

        try {
            publishStatus.isPublished = newStatus;
            await publishStatus.save({
                validateBeforeSave: false,
            })
        } catch (error) {
            throw new Apierror(
                500, error.message
            )
        }

        // console.log("Publish Status: ", publishStatus);

        return res
            .status(200)
            .json(
                new Apiresponse(
                    200,
                    publishStatus,
                    "Published Status Updated Successfully"
                )
            )
    }
)

export {
    publishVideo,
    togglePublishStatus,
    deleteVideo,
    getVideoById
}