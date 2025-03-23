// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS, images, client JS) from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

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
// Landing Page
app.get('/', (req, res) => {
  res.render('index');
});

// Register Page
app.get('/register', (req, res) => {
  res.render('register');
});

// Register Route (Auto-verify new users)
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: 'User already exists! Try logging in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Mark verified: true
    const newUser = new User({ 
      username, 
      email, 
      password: hashedPassword,
      verified: true 
    });
    await newUser.save();

    // Optional: send verification email, etc.

    res.json({ success: true, message: 'Registration successful. Please log in.' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.json({ success: false, message: 'Server error. Please try again.' });
  }
});

// Login Page
app.get('/login', (req, res) => {
  res.render('login');
});

// Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.json({ success: false, message: 'Invalid email or password' });
    }

    // Check if verified
    if (!user.verified) {
      return res.json({ success: false, message: 'Please verify your email before logging in.' });
    }

    // Send user details for localStorage
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        verified: user.verified
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.json({ success: false, message: 'Server error. Please try again.' });
  }
});

// Login Successful Route
app.get('/login-successful', (req, res) => {
  res.render('login-success');
});

// Home Route
app.get('/home', (req, res) => {
  res.render('home');
});

app.get('/services', (req, res) => {
  res.render('services');
});

app.get('/gallery', (req, res) => {
  res.render('gallery');
});

app.get('/team', (req, res) => {
  res.render('team');
});

app.get('/schedule', (req, res) => {
  res.render('schedule');
});

app.get('/reviews', (req, res) => {
  res.render('reviews');
});

app.get('/contact', (req, res) => {
  res.render('contact');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
