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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


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

// send a new post to posts
app.post('/posts', async (req, res) => {
  try {
    const newPost = new Post({
      body: req.body.note,
      author: req.session.user._id
    });

    await newPost.save();

    // Redirect back to the same page
    res.redirect(req.get('Referer'));
  } catch (error) {
    console.log(error)
    res.status(500).send("Error creating post!");
  };
});

// display a specific post
app.get('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      // Populate the author of the post
      .populate('author', 'username')
      // Populate the author of the replies
      .populate('replies.author', 'username');

    if (!post) {
      return res.status(404).render('errors/404', { message: "Post not found" });
    }

    // check if the logged-in user is the post author (so they can edit/delete if its their post)
    const isPostOwner = req.session.user && req.session.user._id.toString() === post.author._id.toString();

    res.render('posts/post.ejs', {
      // pass the post to the view
      post: post,
      isPostOwner: isPostOwner,
      user: req.session.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('errors/500', { message: "Server error" });
  }
});

// post a new reply
app.post('/post/:postId/reply', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).render('errors/404', { message: "Post not found" });
    }

    // create a new reply
    const newReply = {
      body: req.body.body,
      author: req.session.user._id
    };

    // push the new reply to the post's replies array
    post.replies.push(newReply);
    await post.save();

    // redirect to the same post details page
    res.redirect(`/posts/${post._id}`);

  } catch (error) {
    console.log(error);
    res.status(500).send("Error adding reply!");
  }
});

// delete a post
app.delete('/posts/:id', async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    // Redirect to the main feed after deletion
    res.redirect('/bulletinboard');
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting post!");
  }
});

// edit a post
app.get('/posts/:id/edit', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).render('errors/404', { message: "Post not found" });
    }

    res.render('posts/edit.ejs', { post });
  } catch (error) {
    console.error(error);
    res.status(500).render('errors/500', { message: "Server error" });
  }
});

// updates post in the db
app.put('/posts/:id', async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, { body: req.body.body });
    res.redirect(`/posts/${req.params.id}`); // Redirect back to the post details page
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating post!");
  }
});


// ==================================================================================================

app.listen(port, () => {
  console.log(`The express app is ready on port ${port}!`);
}); 