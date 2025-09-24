// --- Online/typing state ---
let allUsers = [];
let onlineUsers = {};

function showGroupOnlineUsers(participantIds) {
  const onlineDiv = document.getElementById("group-online-users");
  if (!allUsers.length) return;
  const online = participantIds.filter(id => onlineUsers[id]);
  const onlineNames = online.map(id => {
    const u = allUsers.find(u => u._id === id);
    return u ? u.userName : id;
  });
  if (online.length > 0) {
    onlineDiv.innerText = `Online: ${onlineNames.join(", ")}`;
    onlineDiv.style.display = "block";
  } else {
    onlineDiv.innerText = "No one online in this group.";
    onlineDiv.style.display = "block";
  }
}

function showIndividualOnlineStatus(participantIds) {
  const onlineDiv = document.getElementById("group-online-users");
  if (!allUsers.length) return;
  const otherId = participantIds.find(id => id !== getUserId());
  const isOnline = !!onlineUsers[otherId];
  const otherUser = allUsers.find(u => u._id === otherId);
  onlineDiv.innerText = `${otherUser ? otherUser.userName : otherId}: ${isOnline ? "Online" : "Offline"}`;
  onlineDiv.style.display = "block";
}
const API_URL = "/api";
let token = null;
let socket = null;
let currentConversation = null;

// Auth
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const logoutBtn = document.getElementById("logout-btn");
const authSection = document.getElementById("auth-section");
const chatSection = document.getElementById("chat-section");
const authMessage = document.getElementById("auth-message");

// On page load, check for token in localStorage
if (localStorage.getItem("token")) {
  token = localStorage.getItem("token");
  showChat();
}

function setCurrentUserInfo() {
  const infoSpan = document.getElementById("current-user-info");
  if (!token) {
    infoSpan.innerText = "";
    return;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    infoSpan.innerText = payload.userName
      ? payload.userName + (payload.email ? ` (${payload.email})` : "")
      : payload.email || "";
  } catch {
    infoSpan.innerText = "";
  }
}

// ----------------- LOGIN -----------------
loginBtn.onclick = async () => {
  const userName = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName, password })
  });
  const data = await res.json();
  if (data.status) {
    token = data.data.token;
    localStorage.setItem("token", token);
    showChat();
  } else {
    authMessage.innerText = data.message;
  }
};

// ----------------- REGISTER -----------------
registerBtn.onclick = async () => {
  const userName = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;
  const email = document.getElementById("register-email").value;
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName, password, email })
  });
  const data = await res.json();
  if (data.status) {
    authMessage.innerText = "Registration successful. Please login.";
  } else {
    authMessage.innerText = data.message;
  }
};

// ----------------- LOGOUT -----------------
logoutBtn.onclick = () => {
  token = null;
  localStorage.removeItem("token");
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  showAuth();
};

function showChat() {
  authSection.style.display = "none";
  chatSection.style.display = "block";
  if (!socket) connectSocket();
  loadConversations();
}

function showAuth() {
  authSection.style.display = "block";
  chatSection.style.display = "none";
  setCurrentUserInfo();
  // Do not connect socket here
}

// ----------------- SOCKET.IO -----------------
function connectSocket() {
  socket = io({
    auth: { token: `Bearer ${token}` }
  });
  socket.on("connect", async () => {
    // Fetch all users for name lookup
    const res = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.status) allUsers = data.data;
  });
  socket.on("message:receive", (msg) => {
    if (msg.conversationId === currentConversation) addMessage(msg);
  });
  socket.on("message:updated", (msg) => {
    const el = document.querySelector(`[data-id='${msg._id}'] .msg-text`);
    if (el) el.textContent = msg.content.text + " (edited)";
  });
  socket.on("message:deleted", ({ messageId }) => {
    const el = document.querySelector(`[data-id='${messageId}']`);
    if (el) el.remove();
  });
  // Typing indicator
  socket.on("typing:update", ({ userId, isTyping }) => {
    const typingDiv = document.getElementById("typing-indicator");
    if (isTyping && userId !== getUserId()) {
      const user = allUsers.find(u => u._id === userId);
      typingDiv.innerText = `${user ? user.userName : userId} is typing...`;
    } else {
      typingDiv.innerText = "";
    }
  });
  // Online status
  socket.on("user:status", ({ userId, status }) => {
    if (status === "online") {
      onlineUsers[userId] = true;
    } else {
      delete onlineUsers[userId];
    }
    // Update online users display if in a chat
    const onlineDiv = document.getElementById("group-online-users");
    if (onlineDiv && currentConversation) {
      // Find current convo type/participants
      fetch(`${API_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(convoData => {
          if (convoData.status) {
            const convo = convoData.data.find(c => c._id === currentConversation);
            if (convo && convo.type === "group") {
              showGroupOnlineUsers(convo.participants);
            } else if (convo && convo.type === "individual") {
              showIndividualOnlineStatus(convo.participants);
            }
          }
        });
    }
  });
}

// ----------------- CONVERSATIONS -----------------
const conversationList = document.getElementById("conversation-list");
const userSearch = document.getElementById("user-search");

userSearch.addEventListener("input", async function () {
  const q = userSearch.value.trim();
  conversationList.innerHTML = "";
  if (!q) {
    loadConversations();
    return;
  }
  const res = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (data.status) {
    const results = data.data.filter(u =>
      (u.userName && u.userName.toLowerCase().includes(q.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(q.toLowerCase()))
    );
    results.forEach(user => {
      if (user._id === getUserId()) return; // skip self
      const li = document.createElement("li");
      li.innerText = user.userName + (user.email ? ` (${user.email})` : "");
      li.onclick = async () => {
        const createRes = await fetch(`${API_URL}/conversations/individual`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ participantId: user._id })
        });
        const createData = await createRes.json();
        if (createData.status) selectConversation(createData.data._id, user.userName);
      };
      conversationList.appendChild(li);
    });
  }
});

async function loadConversations() {
  conversationList.innerHTML = "";
  const res = await fetch(`${API_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (data.status) {
    data.data.forEach(convo => {
      const li = document.createElement("li");
      if (convo.type === "group") {
        li.innerText = `[Group] ${convo.groupInfo.name}`;
      } else {
        const other = convo.participants.find(u => u._id !== getUserId());
        li.innerText = other ? other.userName : "1-1 Chat";
      }
      li.onclick = () => selectConversation(convo._id, li.innerText);
      conversationList.appendChild(li);
    });
  }
}

function getUserId() {
  if (!token) return null;
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.id;
}

async function selectConversation(conversationId, displayName) {
  currentConversation = conversationId;
  document.getElementById("chat-header").innerText = displayName;
  document.getElementById("messages").innerHTML = "";
  document.getElementById("group-online-users").style.display = "none";
  socket.emit("room:join", conversationId);
  // Load message history
  const res = await fetch(`${API_URL}/messages/conversation/${conversationId}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (data.status) {
    data.data.forEach(addMessage);
  }
  // Get conversation details to check type and participants
  const convoRes = await fetch(`${API_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` } });
  const convoData = await convoRes.json();
  if (convoData.status) {
    const convo = convoData.data.find(c => c._id === conversationId);
    if (convo && convo.type === "group") {
      showGroupOnlineUsers(convo.participants);
    } else if (convo && convo.type === "individual") {
      showIndividualOnlineStatus(convo.participants);
    }
  }
}

// ----------------- SEND MESSAGE -----------------
const sendBtn = document.getElementById("send-btn");
const messageInput = document.getElementById("message-input");
let typingTimeout;

sendBtn.onclick = () => {
  const content = messageInput.value;
  if (!content || !currentConversation) return;
  socket.emit("message:send", { conversationId: currentConversation, content });
  messageInput.value = "";
  socket.emit("typing:stop", { conversationId: currentConversation });
};

messageInput.addEventListener("input", () => {
  if (!currentConversation) return;
  socket.emit("typing:start", { conversationId: currentConversation });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing:stop", { conversationId: currentConversation });
  }, 1000);
});

function addMessage(msg) {
  const messagesDiv = document.getElementById("messages");
  const userId = getUserId();
    const isMe = msg.senderId === userId;
  let senderName = "";
  if (msg.sender && msg.sender.userName) {
    senderName = msg.sender.userName;
  } else if (isMe) {
    senderName = "Me";
  } else {
    senderName = "Other";
  }
  const div = document.createElement("div");
  div.className = `chat-message ${isMe ? "me" : "other"}`;
    div.innerHTML = `<b>${isMe ? 'Me' : msg.senderId}:</b> <span class="msg-text">${msg.content.text}</span>`;
    div.style.textAlign = isMe ? "left" : "right";
  if (isMe) {
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.style.marginLeft = "8px";
    editBtn.onclick = () => {
      const newText = prompt("Edit your message:", msg.content.text);
      if (newText && newText !== msg.content.text) {
        socket.emit("message:update", { messageId: msg._id, newContent: newText });
      }
    };
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.style.marginLeft = "4px";
    delBtn.onclick = () => {
      if (confirm("Delete this message?")) {
        socket.emit("message:delete", { messageId: msg._id });
      }
    };
    div.appendChild(editBtn);
    div.appendChild(delBtn);
  }
  div.setAttribute("data-id", msg._id);
  messagesDiv.appendChild(div);
}

// ----------------- GROUP CREATION -----------------
const groupUserSearch = document.getElementById("group-user-search");
const groupUserResults = document.getElementById("group-user-results");
const groupSelectedUsersDiv = document.getElementById("group-selected-users");
let groupSelectedUsers = [];

groupUserSearch.addEventListener("input", async function () {
  const q = groupUserSearch.value.trim();
  groupUserResults.innerHTML = "";
  if (!q) return;
  const res = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (data.status) {
    const results = data.data.filter(u =>
      (u.userName && u.userName.toLowerCase().includes(q.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(q.toLowerCase()))
    );
    results.forEach(user => {
      if (user._id === getUserId() || groupSelectedUsers.some(u => u._id === user._id)) return;
      const li = document.createElement("li");
      li.innerText = user.userName + (user.email ? ` (${user.email})` : "");
      li.style.cursor = "pointer";
      li.onclick = () => {
        groupSelectedUsers.push(user);
        renderGroupSelectedUsers();
        groupUserResults.innerHTML = "";
        groupUserSearch.value = "";
      };
      groupUserResults.appendChild(li);
    });
  }
});

function renderGroupSelectedUsers() {
  groupSelectedUsersDiv.innerHTML = "";
  groupSelectedUsers.forEach((user, idx) => {
    const span = document.createElement("span");
    span.innerText = user.userName + (user.email ? ` (${user.email})` : "");
    span.style.marginRight = "8px";
    const removeBtn = document.createElement("button");
    removeBtn.innerText = "x";
    removeBtn.style.marginLeft = "2px";
    removeBtn.onclick = () => {
      groupSelectedUsers.splice(idx, 1);
      renderGroupSelectedUsers();
    };
    span.appendChild(removeBtn);
    groupSelectedUsersDiv.appendChild(span);
  });
}

const createGroupBtn = document.getElementById("create-group-btn");
createGroupBtn.onclick = async () => {
  const name = document.getElementById("group-name").value;
  if (!name || groupSelectedUsers.length === 0) {
    alert("Please enter group name and add at least one user.");
    return;
  }
  const users = groupSelectedUsers.map(u => u._id);
  const res = await fetch(`${API_URL}/conversations/group`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, participants: users })
  });
  const data = await res.json();
  if (data.status) {
    alert("Group created!");
    groupSelectedUsers = [];
    renderGroupSelectedUsers();
    document.getElementById("group-name").value = "";
    loadConversations();
  } else {
    alert(data.message);
  }
};
