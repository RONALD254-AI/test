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

// Socket.IO Chat
io.on('connection', async (socket) => {
  console.log('A user connected');

  // Prevent sending message history multiple times
  if (!socket.handshake.auth.sentHistory) {
      const messages = await ChatMessage.find().sort({ timestamp: 1 });
      socket.emit('messageHistory', messages);
      socket.handshake.auth.sentHistory = true;
  }

  // Count unseen messages
  const unseenCount = await ChatMessage.countDocuments({ seen: false });
  socket.emit('unseenMessageCount', unseenCount);

  // Ensure only one listener is attached
  socket.removeAllListeners("chatMessage");
  socket.on('chatMessage', async ({ username, message }) => {
    try {
        const newMessage = new ChatMessage({ username, message, seen: false });
        await newMessage.save();
        
        // Broadcast message to all users, ensuring sender is identified
        io.emit('message', { username, message, type: "chat" });
    } catch (error) {
        console.error("Error saving message:", error);
    }
});

  socket.on('markMessagesSeen', async () => {
      await ChatMessage.updateMany({ seen: false }, { $set: { seen: true } });
      io.emit('unseenMessageCount', 0);
  });

  socket.on("endCall", () => {
    socket.broadcast.emit("endCall");
});


  // WebRTC handlers
  socket.on("offer", (offer) => {
      socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
      socket.broadcast.emit("answer", answer);
  });

  socket.on("iceCandidate", (candidate) => {
      socket.broadcast.emit("iceCandidate", candidate);
  });

  socket.on("startCall", () => {
      socket.broadcast.emit("startCall");
  });

  socket.on("endCall", () => {
      socket.broadcast.emit("endCall");
  });

  socket.on("muteCall", (isMuted) => {
      socket.broadcast.emit("muteCall", isMuted);
  });

  socket.on('disconnect', () => {
      console.log('A user disconnected');
      socket.broadcast.emit("endCall");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});