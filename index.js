require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { default: mongoose } = require('mongoose');

const User = require('./user.model');
const Posts = require('./posts.model');
const Comments = require('./comments.model');
const { auth } = require('./auth');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

mongoose.connect('mongodb://127.0.0.1:27017/tryDb');

app.get('/users', (req, res) => {
    User.find((err, users) => {
        if (!err) {
            res.send(users)
        } else {
            res.send(err)
        }
    }).populate({
        path: 'posts', populate: {
            path: 'comments'
        }
    })
})

app.get('/users/:name', (req, res) => {
    User.findOne({ name: req.params.name }, (err, users) => {
        if (!err) {
            res.send(users)
        } else {
            res.send(err)
        }
    })
});

app.get('/api/profile', auth, function (req, res) {
    res.json({
        isAuth: true,
        id: req.user._id,
        email: req.user.email,
        name: req.user.name
    })
});

app.get('/api/logout', auth, function (req, res) {
    req.user.delToken(req.token, (err, user) => {
        if (err) return res.status(400).send(err);
        res.status(200).send({ message: "User logged out", user: req.user });
    });
});

app.post('/api/register', function (req, res) {
    // taking a user
    const newuser = new User(req.body);

    User.findOne({ email: newuser.email }, function (err, user) {
        if (user) return res.status(400).json({ auth: false, message: "email exits" });

        newuser.save((err, doc) => {
            if (err) {
                console.log(err);
                return res.status(400).json({ success: false });
            }
            res.status(200).json({
                succes: true,
                user: doc
            });
        });
    });
});

app.post('/api/login', function (req, res) {
    let token = req.cookies.auth;
    User.findByToken(token, (err, user) => {
        if (err) return res(err);
        if (user) return res.status(400).json({
            error: true,
            message: "You are already logged in",
            user: user
        });

        else {
            User.findOne({ 'email': req.body.email }, function (err, user) {
                if (!user) return res.json({ isAuth: false, message: ' Auth failed ,email not found' });

                user.comparepassword(req.body.password, (err, isMatch) => {
                    if (!isMatch) return res.json({ isAuth: false, message: "password doesn't match" });

                    user.genToken((err, user) => {
                        if (err) return res.status(400).send(err);
                        res.cookie('auth', user.token).json({
                            isAuth: true,
                            id: user._id,
                            name: user.name,
                            email: user.email
                        });
                    });
                });
            });
        }
    });
});

app.patch('/users/:name', (req, res) => {
    User.updateOne(
        { name: req.params.name },
        { $set: req.body },
        { overwrite: true },
        function (err) {
            if (!err) {
                res.send('User updated successfully')
            }
        }
    )
});

app.delete('/users/:name', (req, res) => {
    User.deleteOne({ name: req.params.name }, function (err) {
        if (!err) {
            res.send("User deleted successfully!")
        }
    })
});

app.post('/api/posts/new', auth, (req, res) => {

    console.log(req.user)

    if (req.user) {
        const userId = req.user._id;
        const post = new Posts({
            user: userId,
            title: req.body.title,
            text: req.body.text,
            name: req.body.name,
            email: req.body.email
        });
        post.save()
            .then(() => User.findById(userId))
            .then((user) => {
                user.posts.unshift(post);
                user.save();
                return res.sendStatus(200);
            }).catch((err) => {
                console.log(err.message);
            })
    } else {
        return res.sendStatus(401);
    }

});

app.get('/api/posts', auth, (req, res) => {
    Posts.find({ user: req.user._id }, (err, posts) => {
        if (err) {
            res.send(err)
        } else {
            res.send(posts)
        }
    }).populate('comments')
});

app.post('/api/:postId/comments', (req, res) => {
    const comment = new Comments({
        text: req.body.text
    });

    comment.save()
        .then(() => Posts.findById(req.params.postId))
        .then((post) => {
            post.comments.unshift(comment);
            post.save();
            return res.sendStatus(200);
        }).catch((err) => {
            console.log(err.message);
        })

});

app.get('/api/')


let PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`connected to ${PORT}`)
});





