import { verifyJwt } from "../utils/jwt.js";
import User from "../models/user.model.js";

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ status: false, message: "No token" });

  const decoded = verifyJwt(token);
  if (!decoded) return res.status(401).json({ status: false, message: "Invalid token" });

  const user = await User.findById(decoded.id);
  if (!user) return res.status(401).json({ status: false, message: "User not found" });

  req.user = user;
  next();
}
export default authenticate;
