const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const path = require('path');

const User = require('../models/user.js');
const Post = require('../models/post.js');

  // edit a post
  // /posts/:id/edit
  router.get('/:id/edit', async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
  
      if (!post) {
        console.log(error);
        res.send("Post not found");
      }
  
      res.render('posts/edit.ejs', { post });
    } catch (error) {
      console.error(error);
      res.send("Server error");
    }
  });

  // display a specific post
// /posts/:id
router.get('/:id', async (req, res) => {
    try {
      const post = await Post.findById(req.params.id)
        // Populate the author of the post
        .populate('author', 'username')
        // Populate the author of the replies
        .populate('replies.author', 'username');
  
      if (!post) {
        console.log(error);
        res.send("Post not found!");
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
      res.send("Server error");
    }
  });


// send a new post to posts
// /posts
router.post('/', async (req, res) => {
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
      res.send("Error creating post!");
    };
  });
  

  // post a new reply
  // /post/:postId/reply
  router.post('/:postId/reply', async (req, res) => {
    try {
      const post = await Post.findById(req.params.postId);
  
      if (!post) {
        console.log(error);
        res.send("Post not found");
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
      res.send("Error adding reply!");
    }
  });
  
  // delete a post
  // /posts/:id
  router.delete('/:id', async (req, res) => {
    try {
      await Post.findByIdAndDelete(req.params.id);
      // Redirect to the main feed after deletion
      res.redirect('/bulletinboard');
    } catch (error) {
      console.error(error);
      res.send("Error deleting post!");
    }
  });
  
  // updates post in the db
  // /posts/:id
  router.put('/:id', async (req, res) => {
    try {
      await Post.findByIdAndUpdate(req.params.id, { body: req.body.body });
      res.redirect(`/posts/${req.params.id}`); // Redirect back to the post details page
    } catch (error) {
      console.error(error);
      res.send("Error updating post!");
    }
  });

  module.exports = router;