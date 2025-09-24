import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const userSchema = new mongoose.Schema(
  {
    userName: { type: String, required: [true, "Username is required"], unique: true },
    uniqueName: { type: String, default: "" },
    email: { type: String, default: "" },
    mobileNo: { type: Number, default: null },
    password: { type: String, required: [true, "Password is required"] },
    dateOfBirth: { type: Date, default: null },
    fatherName: { type: String, default: "" },
    motherName: { type: String, default: "" },
    userPhoto: { type: String, default: null },
    // roleId: [{ type: ObjectId, ref: "role" }],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    passwordChangedAt: { type: Date },
    onlineStatus: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  if (!this.isModified("password")) return next();
  this.passwordChangedAt = new Date();
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
