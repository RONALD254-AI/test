let userName = '';

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('nameModal');
  const chatUI = document.querySelector('.chat-container');

  document.getElementById('nameSubmit').addEventListener('click', () => {
    const nameInput = document.getElementById('nameInput');
    if (nameInput.value.trim()) {
      userName = nameInput.value.trim();
      modal.style.display = 'none';
      chatUI.classList.remove('hidden');
    }
  });

  document.getElementById('send-btn').addEventListener('click', () => {
    const input = document.getElementById('message');
    const text = input.value.trim();
    if (!text) return;

    const chatBox = document.getElementById('chat-box');
    const msg = createMessage(text, 'writer', userName);
    chatBox.appendChild(msg.element);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Seen after 3s
    setTimeout(() => {
      msg.info.innerHTML = `${msg.time} <span class="checkmarks">✔✔</span>`;
    }, 3000);

    input.value = '';
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
