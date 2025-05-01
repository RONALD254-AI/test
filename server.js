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
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ Error connecting to MongoDB:', err));

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

// Chat Schema & Model
const chatSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
  seen: { type: Boolean, default: false }
});
const ChatMessage = mongoose.model('ChatMessage', chatSchema);

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
app.get('/chat', (req, res) => res.render('chat'));

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
    console.error('❌ Error registering user:', error);
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
    console.error('❌ Error logging in:', error);
    res.json({ success: false, message: 'Server error.' });
  }
});

// Socket.IO Chat
let users = {}; // Store connected users

io.on('connection', async (socket) => {
  console.log('🔗 A user connected:', socket.id);

  // User joins chat
  socket.on("newUser", async (username) => {
    onlineUsers[socket.id] = username; // Store username
    io.emit("userJoined", { username, onlineUsers });

    // Send chat history ONCE when user joins
    const messages = await ChatMessage.find().sort({ timestamp: 1 }).limit(50);
    socket.emit('messageHistory', messages);
  });

  // Faster message sending: Emit message **before** saving to MongoDB
  socket.on('chatMessage', async ({ username, message }) => {
    const chatData = { username, message, timestamp: new Date() };

    // 🔹 Send message instantly before saving to DB
    io.emit('message', chatData);

    // 🔹 Save message asynchronously without blocking execution
    ChatMessage.create(chatData).catch(err => console.error("❌ Error saving message:", err));
  });

  // Typing indicator
  socket.on('typing', (username) => {
    socket.broadcast.emit('userTyping', username);
  });

  socket.on('stopTyping', (username) => {
    socket.broadcast.emit('userStoppedTyping', username);
  });

  // Handle user disconnecting
  socket.on('disconnect', () => {
    console.log('🔌 A user disconnected:', socket.id);
    if (onlineUsers[socket.id]) {
      const username = onlineUsers[socket.id];
      delete onlineUsers[socket.id]; // Remove user
      io.emit("userLeft", { username, onlineUsers });
    }
    socket.broadcast.emit("endCall"); // Ensure call is cleaned up
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
