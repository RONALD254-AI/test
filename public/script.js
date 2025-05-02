let userName = '';
const socket = io();

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('nameModal');
  const chatUI = document.querySelector('.chat-container');
  const input = document.getElementById('message');
  const sendBtn = document.getElementById('send-btn');
  const chatBox = document.getElementById('chat-box');

  // Prompt user to enter name
  document.getElementById('nameSubmit').addEventListener('click', () => {
    const nameInput = document.getElementById('nameInput');
    if (nameInput.value.trim()) {
      userName = nameInput.value.trim();
      modal.style.display = 'none';
      chatUI.classList.remove('hidden');

      socket.emit('newUser', userName);
    }
  });

  // Send message on button click
  sendBtn.addEventListener('click', sendMessage);

  // Send message on Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  // Send message function
  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    const msg = createMessage(text, 'writer', userName);
    chatBox.appendChild(msg.element);
    chatBox.scrollTop = chatBox.scrollHeight;

    socket.emit('chatMessage', { username: userName, message: text });

    // Seen after 3s (for UI only)
    setTimeout(() => {
      msg.info.innerHTML = `${msg.time} <span class="checkmarks">✔✔</span>`;
    }, 3000);

    input.value = '';
  }

  // Receive previous chat history
  socket.on('messageHistory', (messages) => {
    messages.forEach(({ username, message }) => {
      const role = username === userName ? 'writer' : 'responder';
      const msg = createMessage(message, role, username);
      chatBox.appendChild(msg.element);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });

  // Receive live messages
  socket.on('message', ({ username, message }) => {
    if (username === userName) return; // Already rendered own message
    const msg = createMessage(message, 'responder', username);
    chatBox.appendChild(msg.element);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
});

function createMessage(text, role, senderName) {
  const msg = document.createElement('div');
  msg.classList.add('message', role);

  const avatar = document.createElement('img');
  avatar.src = role === 'writer'
    ? 'https://i.pravatar.cc/30?img=3'
    : 'https://i.pravatar.cc/30?img=5';
  avatar.alt = 'Avatar';
  avatar.className = 'avatar';

  const content = document.createElement('div');
  content.classList.add('message-content');

  const nameTag = document.createElement('div');
  nameTag.classList.add('sender-name');
  nameTag.textContent = senderName || 'Anonymous';

  const messageText = document.createElement('div');
  messageText.classList.add('message-text');
  messageText.innerText = text;

  const messageInfo = document.createElement('div');
  messageInfo.classList.add('message-info');
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  messageInfo.innerHTML =
    role === 'writer' ? `${time} <span class="checkmarks">✔</span>` : time;

  content.appendChild(nameTag);
  content.appendChild(messageText);
  content.appendChild(messageInfo);
  msg.appendChild(content);
  msg.appendChild(avatar);

  return { element: msg, info: messageInfo, time };
}
