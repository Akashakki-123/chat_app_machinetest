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
