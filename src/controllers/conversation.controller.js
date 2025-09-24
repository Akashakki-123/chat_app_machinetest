// Create or get individual conversation
import User from "../models/user.model.js";
export async function createIndividualConversation(req, res) {
  try {
    const { participantId } = req.body;
    if (!participantId) return res.status(400).json({ status: false, message: "Missing participantId" });
    if (participantId === req.user._id.toString()) return res.status(400).json({ status: false, message: "Cannot chat with yourself" });
    const userExists = await User.findById(participantId);
    if (!userExists) return res.status(404).json({ status: false, message: "User not found" });
    let convo = await Conversation.findOne({ type: "individual", participants: { $all: [req.user._id, participantId] } });
    if (!convo) {
      convo = await Conversation.create({ type: "individual", participants: [req.user._id, participantId] });
    }
    res.json({ status: true, data: convo });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
}
// Get all conversations for a user
export async function getUserConversations(req, res) {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "userName email userPhoto onlineStatus")
      .populate("lastMessage")
      .sort({ lastActivity: -1 });
    res.json({ status: true, data: conversations });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
}
import Conversation from "../models/conversation.model.js";

export async function createGroup(req, res) {
  try {
    const { name, participants } = req.body;
    if (!name || !participants?.length) return res.status(400).json({ status: false, message: "Invalid input" });

    // Validate all participant IDs
    const uniqueIds = [...new Set([...participants, req.user._id.toString()])];
    const users = await User.find({ _id: { $in: uniqueIds } });
    if (users.length !== uniqueIds.length) {
      return res.status(400).json({ status: false, message: "One or more users do not exist" });
    }

    const group = await Conversation.create({
      type: "group",
      "groupInfo.name": name,
      participants: uniqueIds,
      "groupInfo.owner": req.user._id,
      "groupInfo.admins": [req.user._id],
    });

    res.json({ status: true, message: "Group created", data: group });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
}

export async function addMember(req, res) {
  try {
    const { conversationId, userId } = req.body;
    const group = await Conversation.findById(conversationId);

    if (!group) return res.status(404).json({ status: false, message: "Group not found" });
    if (!group.groupInfo.admins.includes(req.user._id)) return res.status(403).json({ status: false, message: "Only admin can add" });

    if (!group.participants.includes(userId)) group.participants.push(userId);
    await group.save();

    res.json({ status: true, message: "Member added", data: group });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
}

export async function removeMember(req, res) {
  try {
    const { conversationId, userId } = req.body;
    const group = await Conversation.findById(conversationId);

    if (!group) return res.status(404).json({ status: false, message: "Group not found" });
    if (!group.groupInfo.admins.includes(req.user._id)) return res.status(403).json({ status: false, message: "Only admin can remove" });

    group.participants = group.participants.filter((id) => id.toString() !== userId);
    await group.save();

    res.json({ status: true, message: "Member removed", data: group });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
}
