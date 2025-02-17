const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();


//1. MongoDB Connection

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/urlShortener';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));


//2. Define Mongoose Models


const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

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

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

const shortUrlSchema = new mongoose.Schema({
  full: { type: String, required: true },
  short: { type: String, required: true, unique: true },
  clicks: { type: Number, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const ShortUrl = mongoose.model('ShortUrl', shortUrlSchema);


//3. Middleware & Auth Setup


app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username });
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    if (!await user.comparePassword(password)) return done(null, false, { message: 'Incorrect password.' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}


//4. Routes

app.get('/login', (req, res) => res.render('login'));
app.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login' }));
app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.redirect('/register');

  try {
    if (await User.findOne({ username })) return res.redirect('/register');
    const newUser = new User({ username, email, password });
    await newUser.save();
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.redirect('/register');
  }
});

app.get('/logout', (req, res, next) => {
  req.logout(err => err ? next(err) : res.redirect('/login'));
});

app.get('/', ensureAuthenticated, async (req, res) => {
  const shortUrls = await ShortUrl.find({ user: req.user._id });
  res.render('index', { shortUrls, user: req.user });
});

app.post('/shortUrls', ensureAuthenticated, async (req, res) => {
  const fullUrl = req.body.fullUrl;
  if (!fullUrl) return res.redirect('/');
  const newShortUrl = new ShortUrl({ full: fullUrl, user: req.user._id });
  newShortUrl.short = Math.random().toString(36).substring(7);
  await newShortUrl.save();
  res.redirect('/');
});

app.post('/delete/:id', ensureAuthenticated, async (req, res) => {
  try {
    const shortUrl = await ShortUrl.findById(req.params.id);
    if (!shortUrl || shortUrl.user.toString() !== req.user._id.toString()) {
      return res.status(403).send("Unauthorized");
    }
    await ShortUrl.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (err) {
    res.status(500).send("Error deleting the URL");
  }
});

app.get('/:shortUrl', async (req, res) => {
  try {
    const shortUrl = await ShortUrl.findOne({ short: req.params.shortUrl });
    if (!shortUrl) return res.sendStatus(404);
    shortUrl.clicks++;
    await shortUrl.save();
    res.redirect(shortUrl.full);
  } catch (err) {
    res.status(500).send("Error processing the URL");
  }
});


//5. Start Server


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
