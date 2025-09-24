import { Server } from "socket.io";
import { verifyJwt } from "../src/utils/jwt.js";
import User from "../src/models/user.model.js";
import Conversation from "../src/models/conversation.model.js";
import Message from "../src/models/message.model.js";

const userSockets = new Map(); // userId -> socketId

export function initSocket(server) {
  const io = new Server(server, { cors: { origin: "*" } });

  // ✅ Authentication
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token || socket.handshake.headers["authorization"];
      if (!token) return next(new Error("No token provided"));
      if (token.startsWith("Bearer ")) token = token.slice(7);

      const decoded = verifyJwt(token);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("Invalid user"));

      socket.user = user;
      next();
    } catch (e) {
      next(new Error("Auth error"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    userSockets.set(userId, socket.id);

    await User.findByIdAndUpdate(userId, { onlineStatus: true, lastSeen: new Date() });
    io.emit("user:status", { userId, status: "online" });

    // ✅ Join room
    socket.on("room:join", (conversationId) => {
      socket.join(conversationId);
    });

    // ✅ Send message
    socket.on("message:send", async ({ conversationId, receiverId, content, type = "text" }) => {
      let convo = conversationId
        ? await Conversation.findById(conversationId)
        : await Conversation.findOne({ type: "individual", participants: { $all: [userId, receiverId] } });

      if (!convo && receiverId) {
        convo = await Conversation.create({ type: "individual", participants: [userId, receiverId] });
      }

      const msg = await Message.create({
        conversationId: convo._id,
        senderId: userId,
        type,
        content: { text: content },
      });

      convo.lastMessage = msg._id;
      convo.lastActivity = new Date();
      await convo.save();

      io.to(convo._id.toString()).emit("message:receive", msg);
    });

    // ✅ Update message
    socket.on("message:update", async ({ messageId, newContent }) => {
      const msg = await Message.findById(messageId);
      if (msg && msg.senderId.toString() === userId) {
        msg.content.text = newContent;
        msg.isEdited = true;
        await msg.save();
        io.to(msg.conversationId.toString()).emit("message:updated", msg);
      }
    });

    // ✅ Delete message
    socket.on("message:delete", async ({ messageId }) => {
      const msg = await Message.findById(messageId);
      if (msg && msg.senderId.toString() === userId) {
        msg.isDeleted = true;
        await msg.save();
        io.to(msg.conversationId.toString()).emit("message:deleted", { messageId });
      }
    });

    // ✅ Typing indicator
    socket.on("typing:start", ({ conversationId }) => {
      socket.to(conversationId).emit("typing:update", { userId, isTyping: true });
    });

    socket.on("typing:stop", ({ conversationId }) => {
      socket.to(conversationId).emit("typing:update", { userId, isTyping: false });
    });

    // ✅ Read receipt
    socket.on("message:read", async ({ messageId }) => {
      const msg = await Message.findByIdAndUpdate(messageId, { isRead: true }, { new: true });
      io.to(msg.conversationId.toString()).emit("message:read_status", { messageId, userId });
    });

    socket.on("disconnect", async () => {
      userSockets.delete(userId);
      await User.findByIdAndUpdate(userId, { onlineStatus: false, lastSeen: new Date() });
      io.emit("user:status", { userId, status: "offline" });
    });
  });
}
