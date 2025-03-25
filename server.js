const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
      origin: "*",
  }
});

const users = {}; // Object to store connected users

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Session config
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallbacksecret',
  resave: false,
  saveUninitialized: true
}));

// User Schema & Model
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  verified: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

// Routes
app.get('/', (req, res) => res.render('index'));
app.get('/register', (req, res) => res.render('register'));
app.get('/login', (req, res) => res.render('login'));
app.get('/login-successful', (req, res) => res.render('login-success'));
app.get('/home', (req, res) => res.render('home'));
app.get('/services', (req, res) => res.render('services'));
app.get('/gallery', (req, res) => res.render('gallery'));
app.get('/team', (req, res) => res.render('team'));
app.get('/schedule', (req, res) => res.render('schedule'));
app.get('/reviews', (req, res) => res.render('reviews'));
app.get('/contact', (req, res) => res.render('contact'));

// Register Route
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.json({ success: false, message: 'User already exists!' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword, verified: true });
    await newUser.save();
    
    res.json({ success: true, message: 'Registration successful.' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.json({ success: false, message: 'Server error. Please try again.' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.verified) {
      return res.json({ success: false, message: 'Please verify your email.' });
    }
    res.json({ success: true, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Error logging in:', error);
    res.json({ success: false, message: 'Server error.' });
  }
});

app.get('/chat', (req, res) => {
  res.render('chat');
});

// Handle Contact Form Submission
app.post('/submit', async (req, res) => {
  const { name, email, phone, message } = req.body;

  try {
      let transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
          }
      });

      let mailOptions = {
          from: email,
          to: 'highrontech.united@gmail.com',
          subject: `New Contact Message from ${name}`,
          text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\n\nMessage:\n${message}`
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: 'Message sent successfully!' });

  } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ success: false, message: 'Failed to send message. Try again later.' });
  }
});

const chatSchema = new mongoose.Schema({
    username: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});

const ChatMessage = mongoose.model('ChatMessage', chatSchema);

// Socket.IO Chat
io.on('connection', (socket) => {
    console.log('A user connected');

    ChatMessage.find().sort({ timestamp: 1 }).then(messages => {
        socket.emit('messageHistory', messages);
    });

    socket.on('messageHistory', (messages) => {
      messages.forEach(({ username, message }) => {
          displayMessage(username, message);
      });
  });
  
  socket.on('message', ({ username, message }) => {
      displayMessage(username, message);
  });
  
  function displayMessage(user, message) {
      const messageElement = document.createElement('div');
      messageElement.classList.add('message');
      if (user === username) {
          messageElement.classList.add('own-message');
      }
      messageElement.innerHTML = `<strong>${user}:</strong> ${message}`;
      chat.appendChild(messageElement);
      chat.scrollTop = chat.scrollHeight;
  }
  

    socket.on('chatMessage', async ({ username, message }) => {
        const newMessage = new ChatMessage({ username, message });
        await newMessage.save();
        io.emit('message', { username, message });
    });

    socket.on('register', (username) => {
        users[socket.id] = username;
        io.emit('userJoined', `${username} has joined the chat`);
    });

    socket.on("offer", (offer) => {
        socket.broadcast.emit("offer", offer);
    });

    socket.on("answer", (answer) => {
        socket.broadcast.emit("answer", answer);
    });

    socket.on("iceCandidate", (candidate) => {
        socket.broadcast.emit("iceCandidate", candidate);
    });

    socket.on("startVoiceCall", async () => {
        socket.broadcast.emit("voiceCallStarted", users[socket.id]);
    });

    socket.on("endVoiceCall", () => {
        socket.broadcast.emit("voiceCallEnded", users[socket.id]);
    });

    socket.on('disconnect', () => {
        const username = users[socket.id];
        if (username) {
            io.emit('userLeft', `${username} has left the chat`);
            delete users[socket.id];
        }
        console.log('A user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});