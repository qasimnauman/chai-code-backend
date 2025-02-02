import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { publishVideo } from "../controllers/videos.controller.js";

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
)

export default router