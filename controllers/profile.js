const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const path = require('path');

const User = require('../models/user.js');
const Post = require('../models/post.js');

// redirect
router.get('/', (req, res) => { 
    res.redirect(`/profile/${req.session.user._id}`);
});

// update profile
router.put('/', async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.session.user._id,
            { username: req.body.username },
            { new: true }
        );

        // Update session user data
        req.session.user.username = updatedUser.username;

        res.redirect('/profile');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating profile!");
    }
});

// edit profile comes before :userId so edit can be matched first
router.get('/edit', (req, res) => {
    res.render('profile/editprofile.ejs', { user: req.session.user });
});

// route for viewing a profile
// runs a check to see if it's their own profile or someone else's
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).render('errors/404', { message: "User not found" });
        }

        const userPosts = await Post.find({ author: user._id })
            .sort({ createdAt: -1 });

        res.render('profile/profile.ejs', {
            user,
            isCurrentUser: req.session.user._id.toString() === user._id.toString(),
            posts: userPosts,
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('errors/500', { message: "Server error" });
    }
});

// post a profile image
router.post('/upload', async (req, res) => {
    if (!req.files || !req.files.profileImage) {
        return res.send('No file uploaded.');
    }

    // extract
    const profileImage = req.files.profileImage;

    // Save to uploads folder
    // Node.js path dirname https://nodejs.org/api/path.html#pathdirnamepath
    // path.join handles different environments
    // first set path where the image will be stored
    const uploadPath = path.join(__dirname, '../public/uploads', profileImage.name); 

    
    // Move the uploaded file to the 'uploads' folder using `mv()` method
    profileImage.mv(uploadPath, async (error) => {
        if (error) {
            return res.send(error);
        }
        
        // Update the user's profile image in the database
        try {
            //find user, update their profile image url in the DB
            const user = await User.findById(req.session.user._id);
             // store the relative path in DB
            user.profileImage = `/uploads/${profileImage.name}`;
            await user.save();

            // update session to reflect the profile image change
            req.session.user.profileImage = user.profileImage;

            // redirect to the user's profile page
            // could also redirect to referer i guess..
            res.redirect(`/profile/${user._id}`);
        } catch (error) {
            console.error(error);
            res.status(500).send("Error updating profile image.");
        }
    });
});

// update the user's bio and aboutMe
router.post('/', async (req, res) => {
    const userId = req.session.user._id;
     // grab both bio and aboutMe
    const { bio, aboutMe } = req.body;

    try {
        // update the user's bio and aboutMe in the database
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { bio: bio, aboutMe: aboutMe }, // Update both fields
            { new: true }
        );

        // update session user data
        req.session.user.bio = updatedUser.bio;
        req.session.user.aboutMe = updatedUser.aboutMe;

        // redirect to the updated profile page
        res.redirect(`/profile/${updatedUser._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating profile");
    }
});

module.exports = router;