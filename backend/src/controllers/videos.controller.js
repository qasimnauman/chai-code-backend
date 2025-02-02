import { asyncHandler } from "../utils/asyncHandler.js";
import { Apierror } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import { Apiresponse } from "../utils/Apiresponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
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

        const videoUpload = await uploadOnCloudinary(videoLocalPath);
        const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);

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

export {
    publishVideo
}