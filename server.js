// server.js

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const app = express();

/* =====================================
   1. MongoDB Connection
===================================== */
mongoose
  .connect('mongodb://127.0.0.1:27017/urlShortener', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err));

/* =====================================
   2. Define Mongoose Models
   (User & ShortUrl)
===================================== */

// User Schema & Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// Pre-save hook to hash passwords
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare a given password with the hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// ShortUrl Schema & Model
const shortUrlSchema = new mongoose.Schema({
  full: { type: String, required: true },
  short: { type: String, required: true, unique: true },
  clicks: { type: Number, required: true, default: 0 },
  // Associate each short URL with a user
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const ShortUrl = mongoose.model('ShortUrl', shortUrlSchema);

/* =====================================
   3. Express & Middleware Setup
===================================== */

// Set view engine to EJS (make sure you have your views folder with ejs files)
app.set('view engine', 'ejs');

// Body parser for form submissions
app.use(express.urlencoded({ extended: false }));

// Express Session Middleware
app.use(session({
  secret: 'yourSecretKey', // Replace with an environment variable in production
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

/* =====================================
   4. Passport Configuration
===================================== */

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username: username });
    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return done(null, false, { message: 'Incorrect password.' });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

/* =====================================
   5. Helper Middleware
===================================== */

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

/* =====================================
   6. Utility: Base62 Encoding Function
===================================== */

const characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function encodeBase62(objectId) {
  let num = parseInt(objectId.toString().slice(-6), 16); // Use last 6 hex digits
  let shortUrl = "";
  while (num > 0) {
    shortUrl = characters[num % 62] + shortUrl;
    num = Math.floor(num / 62);
  }
  return shortUrl || "0";
}

/* =====================================
   7. Routes
===================================== */

// Authentication Routes

// Render Login Form
app.get('/login', (req, res) => {
  res.render('login'); // Create views/login.ejs
});

// Process Login Form
app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

// Render Registration Form
app.get('/register', (req, res) => {
  res.render('register'); // Create views/register.ejs
});

// Process Registration Form
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.redirect('/register');
  }
  try {
    // Check if the username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.redirect('/register');
    }
    const newUser = new User({ username, email, password });
    await newUser.save();
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.redirect('/register');
  }
});

// Logout Route
app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/login');
  });
});

// URL Shortener Routes

// Home Route: Display only the URLs created by the logged-in user
app.get('/', ensureAuthenticated, async (req, res) => {
  const shortUrls = await ShortUrl.find({ user: req.user._id });
  res.render('index', { shortUrls, user: req.user }); // Create views/index.ejs
});

// Create a new short URL (for authenticated users)
app.post('/shortUrls', ensureAuthenticated, async (req, res) => {
  const fullUrl = req.body.fullUrl;
  if (!fullUrl) return res.redirect('/');
  
  const newShortUrl = new ShortUrl({ full: fullUrl, user: req.user._id });
  // Generate a Base62 short code from the MongoDB _id
  newShortUrl.short = encodeBase62(newShortUrl._id);
  
  await newShortUrl.save();
  res.redirect('/');
});

// Delete a short URL (only if it belongs to the logged-in user)
app.post('/delete/:id', ensureAuthenticated, async (req, res) => {
  try {
    const shortUrl = await ShortUrl.findById(req.params.id);
    // Verify that the URL belongs to the current user
    if (shortUrl.user.toString() !== req.user._id.toString()) {
      return res.status(403).send("You are not authorized to delete this URL");
    }
    await ShortUrl.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (err) {
    res.status(500).send("Error deleting the URL");
  }
});

// Public Route: Redirect from short URL to full URL
app.get('/:shortUrl', async (req, res) => {
  const shortUrl = await ShortUrl.findOne({ short: req.params.shortUrl });
  if (!shortUrl) return res.sendStatus(404);
  
  shortUrl.clicks++;
  await shortUrl.save();
  
  res.redirect(shortUrl.full);
});

/* =====================================
   8. Start the Server
===================================== */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
