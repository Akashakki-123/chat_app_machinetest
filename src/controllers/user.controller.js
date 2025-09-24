import User from "../models/user.model.js";

// Get all users
export async function getAllUsers(req, res) {
  try {
    const users = await User.find({}, "userName uniqueName email mobileNo dateOfBirth fatherName motherName userPhoto status onlineStatus lastSeen");
    res.json({ status: true, data: users });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
}

// Get user by ID
export async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id, "userName uniqueName email mobileNo dateOfBirth fatherName motherName userPhoto status onlineStatus lastSeen");
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    res.json({ status: true, data: user });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
}

// Update user by ID
export async function updateUser(req, res) {
  try {
    const updateFields = [
      "userName", "uniqueName", "email", "mobileNo", "dateOfBirth", "fatherName", "motherName", "userPhoto", "status"
    ];
    const updateData = {};
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, fields: "userName uniqueName email mobileNo dateOfBirth fatherName motherName userPhoto status onlineStatus lastSeen" });
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    res.json({ status: true, message: "User updated", data: user });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
}

// Delete user by ID
export async function deleteUser(req, res) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    res.json({ status: true, message: "User deleted" });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
}
