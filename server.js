const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const morgan = require('morgan');
const session = require('express-session');

// for profile photos
const fileUpload = require('express-fileupload');
const path = require('path');

const User = require('./models/user'); // Make sure the path is correct
const authController = require('./controllers/auth.js');
const profileController = require('./controllers/profile.js');
const postController = require('./controllers/post.js');
const Post = require('./models/post.js');

const port = process.env.PORT ? process.env.PORT : '3000';

// =================================================================================================

mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
});

// ==================================================================================================

app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(morgan('dev'));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// Serve static css first
app.use(express.static('public'));

// middleware for file uploads
app.use(fileUpload());

// Serve static files for profile images
app.use('/uploads', express.static('public/uploads'));



// ==================================================================================================

// sign in page
app.get('/', (req, res) => {
  res.render('index.ejs', {
    user: req.session.user,
  });
});

// authorize user
app.use('/auth', authController);

app.use('/profile', profileController);

app.use('/posts', postController);

// allow viewing the bulletin board after the user is authorized
app.get('/bulletinboard', async (req, res) => {

  const posts = await Post.find()
    // Populate 'author' with 'username'
    .populate('author', 'username')
    // sort by newest first
    .sort({ createdAt: -1 });

  res.render('bulletinboard/bulletinboard.ejs', {
    // Pass logged-in user info
    user: req.session.user,
    // Pass all posts to the view
    posts: posts,
  })
});

// ==================================================================================================

app.listen(port, () => {
  console.log(`The express app is ready on port ${port}!`);
}); 