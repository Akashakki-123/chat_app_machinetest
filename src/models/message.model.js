import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema;

const messageSchema = new Schema(
  {
    conversationId: { type: ObjectId, ref: "Conversation", required: true },
    senderId: { type: ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["text", "image", "video", "file"], default: "text" },
    content: { text: String, media: { url: String, fileName: String } },
    readBy: [{ userId: { type: ObjectId, ref: "User" }, readAt: { type: Date, default: Date.now } }],
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
