import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addNewSubscription } from "../controllers/subscription.controller.js";

const router = Router();

router.route("/c/:channelId").post(verifyJWT, addNewSubscription);

export default router;