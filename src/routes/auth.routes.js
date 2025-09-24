import { Router } from "express";
import { register, login, updateUser, deleteUser } from "../controllers/auth.controller.js";
import authenticate from "../middlewares/auth.js";

const router = Router();
router.post("/register", register);
router.post("/login", login);

export default router;

// User update/delete (protected)
router.put("/update", authenticate, updateUser);
router.delete("/delete", authenticate, deleteUser);
