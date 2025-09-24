import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { getMessagesByConversation } from "../controllers/message.controller.js";

const router = Router();

// Get messages by conversation ID
router.get("/conversation/:conversationId", authenticate, getMessagesByConversation);

export default router;
