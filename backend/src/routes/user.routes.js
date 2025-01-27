import { Router } from "express"
import {
    changeUserCurrentPassword,
    getCurrectUser, 
    getUserChannelProfile, 
    loginUser, 
    logoutUser,
    refreshAccessToken,
    registerUser,
    upadateUserAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserWatchHistory
} from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);

// Non Secure Routes
router.route("/login").post(loginUser);

// Secured Routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeUserCurrentPassword);
router.route("/update-info").patch(verifyJWT, upadateUserAccountDetails);
router.route("/current-user").get(verifyJWT, getCurrectUser);

router.route("/update-avatar").patch(verifyJWT, upload.single("avatar",), updateAvatar);
router.route("/update-coverImage").patch(verifyJWT, upload.single("coverImage",), updateCoverImage);
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/watchHistory").get(verifyJWT, getUserWatchHistory);

export default router;