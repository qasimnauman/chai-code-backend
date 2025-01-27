import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    addNewSubscription,
    getUserChannelSubscribers
} from "../controllers/subscription.controller.js";

const router = Router();

router.route("/c/:channelId/subscribe").post(verifyJWT, addNewSubscription);
router.route("/c/:channelId/subscribers").get(verifyJWT, getUserChannelSubscribers);

export default router;