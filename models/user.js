const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  profileImage: { 
    type: String,
  },
  bio: {
    type: String,
  },
  aboutMe: {
    type: String,
  },
  socials: {
    type: String,
  },
  favArtists: {
    type: String,
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;