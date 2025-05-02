let socket = io();
let userName = '';

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('nameModal');
  const chatUI = document.querySelector('.chat-container');
  const input = document.getElementById('message');

  document.getElementById('nameSubmit').addEventListener('click', () => {
    const nameInput = document.getElementById('nameInput');
    if (nameInput.value.trim()) {
      userName = nameInput.value.trim();
      socket.emit("newUser", userName);
      modal.style.display = 'none';
      chatUI.classList.remove('hidden');
    }
  });

  const sendMessage = () => {
    const text = input.value.trim();
    if (!text) return;
    socket.emit('chatMessage', { username: userName, message: text });
    input.value = '';
  };

  document.getElementById('send-btn').addEventListener('click', sendMessage);
  input.addEventListener('keypress', e => {
    if (e.key === 'Enter') sendMessage();
  });

  socket.on('message', ({ username, message, timestamp }) => {
    const chatBox = document.getElementById('chat-box');
    const role = username === userName ? 'writer' : 'responder';
    const msg = createMessage(message, role, username, timestamp);
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
  });

  socket.on('messageHistory', messages => {
    const chatBox = document.getElementById('chat-box');
    messages.forEach(({ username, message, timestamp }) => {
      const role = username === userName ? 'writer' : 'responder';
      const msg = createMessage(message, role, username, timestamp);
      chatBox.appendChild(msg);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  });
});

function createMessage(text, role, senderName, timeStr) {
  const msg = document.createElement('div');
  msg.classList.add('message', role);

  const content = document.createElement('div');
  content.classList.add('message-content');

  const nameTag = document.createElement('div');
  nameTag.classList.add('sender-name');
  nameTag.textContent = senderName;

  const messageText = document.createElement('div');
  messageText.classList.add('message-text');
  messageText.innerText = text;

  const messageInfo = document.createElement('div');
  messageInfo.classList.add('message-info');
  const time = new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  messageInfo.innerHTML = role === 'writer' ? `${time} <span class="checkmarks">✔</span>` : time;

  content.appendChild(nameTag);
  content.appendChild(messageText);
  content.appendChild(messageInfo);
  msg.appendChild(content);

  return msg;
}
