const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const morgan = require('morgan');
const session = require('express-session');

const User = require('./models/user'); // Make sure the path is correct
const authController = require('./routes/auth.js');
const Post = require('./models/post.js');

const port = process.env.PORT ? process.env.PORT : '3000';

mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
});

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

app.get('/', (req, res) => {
  res.render('index.ejs', {
    user: req.session.user,
  });
});

// app.get('/vip-lounge', (req, res) => {
//   if (req.session.user) {
//     res.send(`Welcome to the party ${req.session.user.username}.`);
//   } else {
//     res.send('Sorry, no guests allowed.');
//   }
// });

app.use('/auth', authController);

//define AFTER auth, right?
app.get('/bulletinboard', async (req, res) => {
  
  const posts = await Post.find()
  // Populate 'author' with 'username'
  .populate('author', 'username')
  // sort by newest first
  .sort({createdAt: -1}); 

    res.render('bulletinboard/bulletinboard.ejs', {
      // Pass logged-in user info
      user: req.session.user, 
      // Pass all posts to the view
      posts: posts,  
  })
});

app.get('/profile', (req, res) => {
  res.redirect(`/profile/${req.session.user._id}`);
});


// Route for viewing another person's profile, not editable
app.get('/profile/:userId', async (req, res) => {

  try {
    const user = await User.findById(req.params.userId); // Find user by ID

    if (!user) {
      return res.status(404).render('errors/404', { message: "User not found" });
    }

    // Fetch only posts made by this specific user
    const userPosts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 });

    res.render('profile/profile.ejs', {
      // profile owner
      user,
      // Check if viewing own profile
      isCurrentUser: req.session.user._id.toString() === user._id.toString(), 
      // Pass posts of this user
      posts: userPosts, 
    });

  } catch (error) {
    console.error(error);
    res.status(500).render('errors/500', { message: "Server error" });
  }
});

//send user post to posts 
app.post('/posts', async (req, res) => {
  try {
    const newPost = new Post({
      body: req.body.note,
      author: req.session.user._id
    });

    await newPost.save();

    res.redirect('bulletinboard');
  } catch (error) {
    console.log(error)
    res.status(500).send("Error creating post!");
  };
});

// display a specific post
app.get('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username');

    if (!post) {
      return res.status(404).render('errors/404', { message: "Post not found" });
    }

    res.render('posts/post.ejs', {
      // Pass the post to the view
      post: post,  
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('errors/500', { message: "Server error" });
  }
});

app.post('/post/:postId/reply', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).render('errors/404', { message: "Post not found" });
    }

    // Create the new reply
    const newReply = {
      body: req.body.body,
      author: req.session.user._id
    };

    // Push the new reply to the post's replies array
    post.replies.push(newReply);
    await post.save();

    // Redirect to the same post details page
    res.redirect(`/posts/${post._id}`);

  } catch (error) {
    console.log(error);
    res.status(500).send("Error adding reply!");
  }
});

app.listen(port, () => {
  console.log(`The express app is ready on port ${port}!`);
}); 