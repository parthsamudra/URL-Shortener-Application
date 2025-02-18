const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();

// 1. MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/urlShortener';
const client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
let db;
async function connectDB() {
    try {
        await client.connect();
        db = client.db();
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
}
connectDB();

// 2. Define MongoDB Collections
async function getCollection(name) {
    if (!db) throw new Error("Database not connected");
    return db.collection(name);
}

//Used ChatGpt and Google to find approach to short URL
// Short URL Logic
function generateShortUrl(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let shortUrl = '';
    for (let i = 0; i < length; i++) {
        shortUrl += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return shortUrl;
}

// 3. Middleware & Auth Setup
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
        const users = await getCollection("users");
        const user = await users.findOne({ username });
        if (!user) return done(null, false, { message: 'Incorrect username.' });
        if (!await bcrypt.compare(password, user.password)) return done(null, false, { message: 'Incorrect password.' });
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
    try {
        const users = await getCollection("users");
        const user = await users.findOne({ _id: new ObjectId(id) });
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}

// 4. Routes
app.get('/login', (req, res) => res.render('login'));

app.post('/login', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login' }));

app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.redirect('/register');

    try {
        const users = await getCollection("users");
        if (await users.findOne({ username })) return res.redirect('/register');
        const hashedPassword = await bcrypt.hash(password, 10);
        await users.insertOne({ username, email, password: hashedPassword });
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
    const shortUrls = await (await getCollection("urls")).find({ user: req.user._id }).toArray();
    res.render('index', { shortUrls, user: req.user });
});

app.post('/shortUrls', ensureAuthenticated, async (req, res) => {
    const fullUrl = req.body.fullUrl;
    if (!fullUrl) return res.redirect('/');
    const shortUrls = await getCollection("urls");
    
    let short;
    let exists;
    do {
        short = generateShortUrl();
        exists = await shortUrls.findOne({ short });
    } while (exists); // Ensure uniqueness
    
    await shortUrls.insertOne({ full: fullUrl, short, clicks: 0, user: req.user._id });
    res.redirect('/');
});

app.get('/:shortUrl', async (req, res) => {
    try {
        const shortUrls = await getCollection("urls");
        const shortUrl = await shortUrls.findOne({ short: req.params.shortUrl });
        if (!shortUrl) return res.sendStatus(404);

        // Increment the click count
        await shortUrls.updateOne({ short: req.params.shortUrl }, { $inc: { clicks: 1 } });

        res.redirect(shortUrl.full);
    } catch (err) {
        res.status(500).send("Error processing the URL");
    }
});

// 5. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
