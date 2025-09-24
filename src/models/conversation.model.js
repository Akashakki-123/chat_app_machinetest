import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema;

const conversationSchema = new Schema(
  {
    type: { type: String, enum: ["individual", "group"], required: true },
    participants: [{ type: ObjectId, ref: "User", required: true }],
    groupInfo: {
      name: { type: String, default: "" },
      groupPhoto: { type: String, default: "" },
      description: { type: String, default: "" },
      admins: [{ type: ObjectId, ref: "User" }],
      owner: { type: ObjectId, ref: "User" }
    },
    lastMessage: { type: ObjectId, ref: "Message" },
    lastActivity: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
