// --- Auth UI toggle and user update/delete ---
window.addEventListener('DOMContentLoaded', function () {
  // Auth form toggle
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const authSection = document.getElementById('auth-section');
  const registerCard = document.getElementById('register-card');
  if (showRegister && showLogin && registerCard) {
    showRegister.onclick = (e) => {
      e.preventDefault();
      authSection.querySelector('.auth-card').style.display = 'none';
      registerCard.style.display = '';
    };
    showLogin.onclick = (e) => {
      e.preventDefault();
      registerCard.style.display = 'none';
      authSection.querySelector('.auth-card').style.display = '';
    };
  }

  // User update/delete stubs
  const updateBtn = document.getElementById('update-user-btn');
  const deleteBtn = document.getElementById('delete-user-btn');
  if (updateBtn) {
    updateBtn.onclick = async function () {
      const userName = prompt('Enter new username (leave blank to keep unchanged):');
      const email = prompt('Enter new email (leave blank to keep unchanged):');
      const password = prompt('Enter new password (leave blank to keep unchanged):');
      if (!userName && !email && !password) return alert('Nothing to update.');
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userName, email, password })
      });
      const data = await res.json();
      if (data.status) {
        alert('User updated! Please log in again.');
        localStorage.removeItem('token');
        location.reload();
      } else {
        alert(data.message || 'Update failed');
      }
    };
  }
  if (deleteBtn) {
    deleteBtn.onclick = async function () {
      if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/auth/delete', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.status) {
          alert('Account deleted.');
          localStorage.removeItem('token');
          location.reload();
        } else {
          alert(data.message || 'Delete failed');
        }
      }
    };
  }
});
// --- Image Upload Integration ---
window.addEventListener('DOMContentLoaded', function () {
  const imageBtn = document.getElementById('image-btn');
  const imageInput = document.getElementById('image-input');
  if (imageBtn && imageInput) {
    imageBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', function () {
      const file = imageInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        if (!window.currentConversation && typeof currentConversation === 'undefined') return;
        const convId = window.currentConversation || currentConversation;
        socket.emit('message:send', {
          conversationId: convId,
          type: 'image',
          content: { media: { url: e.target.result, fileName: file.name } }
        });
      };
      reader.readAsDataURL(file);
      imageInput.value = '';
    });
  }
});

// DOM elements (must be at the very top to avoid ReferenceError)

// --- Online/typing state ---
let allUsers = [];
let onlineUsers = {}; // userId -> { userName, email, onlineStatus, lastSeen }

function showGroupOnlineUsers(participantIds) {
  const onlineDiv = document.getElementById("group-online-users");
  if (!allUsers.length) return;

  // All users who are online (not just in this group)
  const allOnlineUserIds = Object.keys(onlineUsers);
  const allOnlineNames = allOnlineUserIds.map(id => {
    const u = onlineUsers[id];
    if (u?.userName) return u.userName;
    if (u?.email) return u.email;
    const userObj = allUsers.find(u => u._id === id);
    return userObj ? userObj.userName : id;
  });

  // For this group, show which are online
  const online = participantIds.filter(id => onlineUsers[id]?.onlineStatus);
  const onlineNames = online.map(id => {
    const u = onlineUsers[id];
    if (u?.userName) return u.userName;
    if (u?.email) return u.email;
    const userObj = allUsers.find(u => u._id === id);
    return userObj ? userObj.userName : id;
  });

  let html = '';
  if (online.length > 0) {
    html += `Online in this group: <b>${onlineNames.join(", ")}</b><br>`;
  } else {
    html += 'No one online in this group.<br>';
  }
  html += `Total users online: <b>${allOnlineNames.length}</b> (${allOnlineNames.join(", ")})`;
  onlineDiv.innerHTML = html;
  onlineDiv.style.display = "block";
}

function showIndividualOnlineStatus(participantIds) {
  const onlineDiv = document.getElementById("group-online-users");
  if (!allUsers.length) return;

  const otherId = participantIds.find(id => id !== getUserId());
  let name = '';
  let statusText = '';
  if (otherId) {
    const otherUser = onlineUsers[otherId] || allUsers.find(u => u._id === otherId);
    if (otherUser && typeof otherUser === 'object') {
      if (typeof otherUser.userName === 'string' && otherUser.userName) {
        name = otherUser.userName;
      } else if (typeof otherUser.email === 'string' && otherUser.email) {
        name = otherUser.email;
      } else {
        name = '';
      }
    } else if (typeof otherUser === 'string') {
      name = otherUser;
    }
    statusText = (otherUser && otherUser.onlineStatus === true)
      ? "<span style='color:green;font-weight:bold'>Online</span>"
      : "<span style='color:red;font-weight:bold'>Offline</span>";
  }
  // All users who are online
  const allOnlineUserIds = Object.keys(onlineUsers);
  const allOnlineNames = allOnlineUserIds.map(id => {
    const u = onlineUsers[id];
    if (u?.userName) return u.userName;
    if (u?.email) return u.email;
    const userObj = allUsers.find(u => u._id === id);
    return userObj ? userObj.userName : id;
  });
  let html = '';
  if (name) {
    html += `${name}: ${statusText}<br>`;
  }
  html += `Total users online: <b>${allOnlineNames.length}</b> (${allOnlineNames.join(", ")})`;
  onlineDiv.innerHTML = html;
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

  // ✅ Typing indicator with user name
  socket.on("typing:update", ({ userId, isTyping, userName, email }) => {
    console.log('[FRONTEND] typing:update event:', { userId, isTyping, userName, email });
    const myId = getUserId();
    const typingDiv = document.getElementById("typing-indicator");
    let name = userName || email || (allUsers.find(u => u._id === userId)?.userName) || userId;
    if (typeof isTyping === 'undefined') {
      console.error('[FRONTEND] typing:update event missing isTyping:', { userId, userName, email });
      return;
    }
    if (isTyping && userId !== myId) {
      typingDiv.innerText = `${name} typing...`;
      typingDiv.style.display = "block";
    } else if (!isTyping && userId !== myId) {
      typingDiv.innerText = "";
      typingDiv.style.display = "none";
    }
  });

  // ✅ Online status updates
  socket.on("user:status", ({ userId, onlineStatus, userName, email, lastSeen }) => {
    if (onlineStatus) {
      onlineUsers[userId] = { userName, email, onlineStatus, lastSeen };
    } else {
      delete onlineUsers[userId];
    }

    if (currentConversation) {
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
// Move these to the top so they're available before any function uses them
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
  return payload.id || payload._id; // ✅ safer
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

  // Get conversation details
  const convoRes = await fetch(`${API_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` } });
  const convoData = await convoRes.json();
  if (convoData.status) {
    const convo = convoData.data.find(c => c._id === conversationId);
    if (convo && convo.type === "group") {
      showGroupOnlineUsers(convo.participants);

      // --- Group management UI ---
      renderGroupManagement(convo);
    } else if (convo && convo.type === "individual") {
      showIndividualOnlineStatus(convo.participants);
      document.getElementById("group-management-ui")?.remove();
    }
  }
}

// Group management UI rendering
function renderGroupManagement(convo) {
  // Remove old UI if exists
  document.getElementById("group-management-ui")?.remove();
  const chatHeader = document.getElementById("chat-header");
  const groupDiv = document.createElement("div");
  groupDiv.id = "group-management-ui";
  groupDiv.style.margin = "10px 0";
  // Members list
  const membersTitle = document.createElement("div");
  membersTitle.innerText = "Group Members:";
  membersTitle.style.fontWeight = "bold";
  groupDiv.appendChild(membersTitle);
  const membersList = document.createElement("ul");
  membersList.style.listStyle = "none";
  membersList.style.padding = "0";
  convo.participants.forEach(member => {
    const user = allUsers.find(u => u._id === (member._id || member));
    const li = document.createElement("li");
    li.style.marginBottom = "4px";
    li.innerText = user ? (user.userName || user.email || user._id) : member._id || member;
    // Remove button (if admin and not self)
    const isAdmin = convo.groupInfo.admins.some(a => a.toString() === getUserId());
    if (isAdmin && (user?._id || member) !== getUserId()) {
      const removeBtn = document.createElement("button");
      removeBtn.innerText = "Remove";
      removeBtn.style.marginLeft = "8px";
      removeBtn.onclick = async () => {
        if (confirm("Remove this member?")) {
          await fetch(`${API_URL}/conversations/group/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ conversationId: convo._id, userId: user?._id || member })
          });
          selectConversation(convo._id, `[Group] ${convo.groupInfo.name}`);
        }
      };
      li.appendChild(removeBtn);
    }
    membersList.appendChild(li);
  });
  groupDiv.appendChild(membersList);

  // Add member UI (if admin)
  const isAdmin = convo.groupInfo.admins.some(a => a.toString() === getUserId());
  if (isAdmin) {
    const addDiv = document.createElement("div");
    addDiv.style.marginTop = "8px";
    const addInput = document.createElement("input");
    addInput.placeholder = "Add member by name/email...";
    addInput.style.marginRight = "6px";
    addDiv.appendChild(addInput);
    const addBtn = document.createElement("button");
    addBtn.innerText = "Add";
    addBtn.onclick = async () => {
      const q = addInput.value.trim().toLowerCase();
      if (!q) return;
      const user = allUsers.find(u =>
        (u.userName && u.userName.toLowerCase() === q) ||
        (u.email && u.email.toLowerCase() === q)
      );
      if (!user) return alert("User not found");
      await fetch(`${API_URL}/conversations/group/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: convo._id, userId: user._id })
      });
      selectConversation(convo._id, `[Group] ${convo.groupInfo.name}`);
    };
    addDiv.appendChild(addBtn);
    groupDiv.appendChild(addDiv);
  }

  // Delete group button (if owner or admin)
  if (
    convo.groupInfo.owner?.toString() === getUserId() ||
    convo.groupInfo.admins.some(a => a.toString() === getUserId())
  ) {
    const delBtn = document.createElement("button");
    delBtn.innerText = "Delete Group";
    delBtn.style.marginLeft = "16px";
    delBtn.style.background = "#e11d48";
    delBtn.style.color = "#fff";
    delBtn.onclick = async () => {
      if (confirm("Are you sure you want to delete this group?")) {
        await fetch(`${API_URL}/conversations/group/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ conversationId: convo._id })
        });
        loadConversations();
        document.getElementById("chat-header").innerText = "";
        document.getElementById("messages").innerHTML = "";
        document.getElementById("group-management-ui")?.remove();
        document.getElementById("group-online-users").style.display = "none";
      }
    };
    groupDiv.appendChild(delBtn);
  }

  chatHeader.appendChild(groupDiv);
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

// function addMessage(msg) {
//   const messagesDiv = document.getElementById("messages");
//   const userId = getUserId();
//   const isMe = msg.senderId === userId;

//   let senderName = "";
//   if (msg.sender && msg.sender.userName) {
//     senderName = msg.sender.userName;
//   } else if (isMe) {
//     senderName = "Me";
//   } else {
//     senderName = msg.senderId;
//   }

//   const div = document.createElement("div");
//   div.className = `chat-message ${isMe ? "me" : "other"}`;
//   div.innerHTML = `<b>${senderName}:</b> <span class="msg-text">${msg.content.text}</span>`;
//   div.style.textAlign = isMe ? "left" : "right";

//   if (isMe) {
//     const editBtn = document.createElement("button");
//     editBtn.textContent = "Edit";
//     editBtn.style.marginLeft = "8px";
//     editBtn.onclick = () => {
//       const newText = prompt("Edit your message:", msg.content.text);
//       if (newText && newText !== msg.content.text) {
//         socket.emit("message:update", { messageId: msg._id, newContent: newText });
//       }
//     };

//     const delBtn = document.createElement("button");
//     delBtn.textContent = "Delete";
//     delBtn.style.marginLeft = "4px";
//     delBtn.onclick = () => {
//       if (confirm("Delete this message?")) {
//         socket.emit("message:delete", { messageId: msg._id });
//       }
//     };

//     div.appendChild(editBtn);
//     div.appendChild(delBtn);
//   }

//   div.setAttribute("data-id", msg._id);
//   messagesDiv.appendChild(div);
// }

// ----------------- GROUP CREATION -----------------

function addMessage(msg) {
  const messagesDiv = document.getElementById("messages");
  const userId = getUserId();
  const isMe = msg.senderId === userId;

  // sender name
  let senderName;
  if (isMe) {
    senderName = "Me";
  } else if (msg.sender && (msg.sender.userName || msg.sender.email)) {
    senderName = msg.sender.userName || msg.sender.email;
  } else if (msg.senderId) {
    // Try to find user in allUsers by senderId
    const userObj = Array.isArray(allUsers) ? allUsers.find(u => u._id === msg.senderId) : null;
    senderName = userObj?.userName || userObj?.email || msg.senderId || "Unknown";
  } else {
    senderName = "Unknown";
  }

  // message wrapper (for alignment)
  const wrapper = document.createElement("div");
  wrapper.className = `msg-wrapper ${isMe ? "me" : "other"}`;

  // chat bubble
  const div = document.createElement("div");
  div.className = `chat-message ${isMe ? "me" : "other"}`;
  div.setAttribute("data-id", msg._id);

  // sender label
  const senderEl = document.createElement("span");
  senderEl.className = "sender";
  senderEl.textContent = senderName;

  // message content (text or image)
  div.appendChild(senderEl);
  if (msg.type === 'image' && msg.content?.media?.url) {
    const img = document.createElement('img');
    img.src = msg.content.media.url;
    img.alt = msg.content.media.fileName || 'image';
    img.style.maxWidth = '200px';
    img.style.maxHeight = '200px';
    img.className = 'msg-image';
    div.appendChild(img);
  } else {
    const textEl = document.createElement("span");
    textEl.className = "msg-text";
    textEl.textContent = msg.content.text + (msg.isEdited ? " (edited)" : "");
    div.appendChild(textEl);
  }

  // edit/delete (only for me)
  if (isMe) {
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "msg-btn";
    editBtn.onclick = () => {
      const newText = prompt("Edit your message:", msg.content.text);
      if (newText && newText !== msg.content.text) {
        socket.emit("message:update", { messageId: msg._id, newContent: newText });
      }
    };

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "msg-btn";
    delBtn.onclick = () => {
      if (confirm("Delete this message?")) {
        socket.emit("message:delete", { messageId: msg._id });
      }
    };

    div.appendChild(editBtn);
    div.appendChild(delBtn);
  }

  wrapper.appendChild(div);
  messagesDiv.appendChild(wrapper);

  // auto-scroll
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}


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
