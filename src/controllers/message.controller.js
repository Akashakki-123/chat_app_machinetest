import Message from "../models/message.model.js";

// Get messages by conversation ID
export async function getMessagesByConversation(req, res) {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId, isDeleted: { $ne: true } })
      .sort({ createdAt: 1 });
    res.json({ status: true, data: messages });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
}
