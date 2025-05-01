document.getElementById('send-btn').addEventListener('click', sendMessage);

function sendMessage() {
  const input = document.getElementById('message');
  const text = input.value.trim();
  if (!text) return;

  const chatBox = document.getElementById('chat-box');

  // Create message container
  const msg = document.createElement('div');
  msg.classList.add('message');

  // Create profile image
  const avatar = document.createElement('img');
  avatar.src = 'https://i.pravatar.cc/30?img=3';
  avatar.alt = 'Avatar';
  avatar.className = 'avatar';

  // Create content wrapper
  const content = document.createElement('div');
  content.classList.add('message-content');

  const messageText = document.createElement('div');
  messageText.classList.add('message-text');
  messageText.innerText = text;

  const messageInfo = document.createElement('div');
  messageInfo.classList.add('message-info');
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  messageInfo.innerHTML = `${timestamp} <span class="checkmarks">✔✔</span>`;

  content.appendChild(messageText);
  content.appendChild(messageInfo);

  msg.appendChild(content);
  msg.appendChild(avatar);
  chatBox.appendChild(msg);

  chatBox.scrollTop = chatBox.scrollHeight;
  input.value = '';
}
