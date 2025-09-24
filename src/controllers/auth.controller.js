
// Update user (username, email, password)
export async function updateUser(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ status: false, message: "Unauthorized" });
    const { userName, email, password } = req.body;
    const update = {};
    if (userName) update.userName = userName;
    if (email) update.email = email;
    if (password) update.password = encryptPassword(password);
    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    res.json({ status: true, message: "User updated", data: { userName: user.userName, email: user.email } });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
}

// Delete user
export async function deleteUser(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ status: false, message: "Unauthorized" });
    await User.findByIdAndDelete(userId);
    res.json({ status: true, message: "User deleted" });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
}
import User from "../models/user.model.js";
import { encryptPassword, verifyPassword } from "../utils/encrypt.js";
import { signJwt } from "../utils/jwt.js";

export async function register(req, res) {
  try {
    const { userName, password, email } = req.body;
    if (!userName || !password) return res.status(400).json({ status: false, message: "Missing fields" });

    const exists = await User.findOne({ userName });
    if (exists) return res.status(400).json({ status: false, message: "Username taken" });

    const hashed = encryptPassword(password);
    const user = await User.create({ userName, password: hashed, email });

    res.status(201).json({ status: true, message: "User created", data: { id: user._id, userName: user.userName } });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
}

export async function login(req, res) {
  try {
    const { userName, password } = req.body;
    const user = await User.findOne({ userName });
    if (!user) return res.status(400).json({ status: false, message: "Invalid credentials" });

    if (!verifyPassword(password, user.password)) return res.status(400).json({ status: false, message: "Invalid credentials" });

    const token = signJwt({ id: user._id, userName: user.userName });
    res.json({ status: true, message: "Login success", data: { token } });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
}
