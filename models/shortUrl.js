// models/shortUrl.js
const mongoose = require('mongoose');

const shortUrlSchema = new mongoose.Schema({
  full: {
    type: String,
    required: true
  },
  short: {
    type: String,
    required: true,
    unique: true
  },
  clicks: {
    type: Number,
    required: true,
    default: 0
  },
  // Associate each short URL with a user
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('ShortUrl', shortUrlSchema);
