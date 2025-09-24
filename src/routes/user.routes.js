
import { Router } from "express";
import { getAllUsers, getUserById, updateUser, deleteUser } from "../controllers/user.controller.js";
import authenticate from "../middlewares/auth.js";

const router = Router();

// Get all users
router.get("/", authenticate, getAllUsers);
// Get user by ID
router.get("/:id", authenticate, getUserById);
// Update user by ID
router.put("/:id", authenticate, updateUser);
// Delete user by ID
router.delete("/:id", authenticate, deleteUser);

export default router;
