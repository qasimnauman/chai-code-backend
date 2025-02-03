import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    deleteVideo,
    getVideoById,
    publishVideo,
    togglePublishStatus
} from "../controllers/videos.controller.js";

const router = Router();

router.route("/publish-video").post(verifyJWT,
    upload.fields([
        {
            name: "videofile",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    publishVideo
);

router.route("/c/:videoId/:newStatus/toggle-publish").patch(verifyJWT, togglePublishStatus);
router.route("/c/:videoId/delete-video").post(verifyJWT, deleteVideo);

// Non Secure Routes
router.route("/get-video/c/:videoId").get(getVideoById);
export default router