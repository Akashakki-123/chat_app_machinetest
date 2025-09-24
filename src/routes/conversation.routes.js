
import { Router } from "express";
import { createGroup, addMember, removeMember, getUserConversations, createIndividualConversation } from "../controllers/conversation.controller.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Create or get individual conversation
router.post("/individual", authenticate, createIndividualConversation);

// Get all conversations for the logged-in user
router.get("/", authenticate, getUserConversations);
// Group creation
router.post("/group", authenticate, createGroup);
// Add member to group
router.post("/group/add", authenticate, addMember);
// Remove member from group
router.post("/group/remove", authenticate, removeMember);

export default router;
