require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const salt = 10;

const UserSchema = new mongoose.Schema({
    userId: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    posts: [{
        type: Schema.Types.ObjectId,
        ref: "Posts"
    }]
});

UserSchema.pre('save', function (next) {
    var user = this;
    if (user.isModified('password')) {
        bcrypt.genSalt(salt, function (err, salt) {
            if (err) return next(err);
            bcrypt.hash(user.password, salt, function (err, hash) {
                if (err) return next(err);
                user.password = hash;
                next();
            })
        })
    } else {
        next();
    }
});

UserSchema.methods.comparepassword = function (password, cb) {
    bcrypt.compare(password, this.password, function (err, isMatch) {
        if (err) return cb(next);
        cb(null, isMatch);
    })
};

UserSchema.methods.genToken = function (cb) {
    var user = this;
    var token = jwt.sign(user._id.toHexString(), process.env.SECRET_KEY);
    user.token = token;
    user.save(function (err, user) {
        if (err) return cb(err);
        cb(null, user);
    })
};

UserSchema.statics.findByToken = function (token, cb) {
    var user = this;
    jwt.verify(token, process.env.SECRET_KEY, function (err, decode) {
        user.findOne({ "_id": decode, "token": token }, function (err, user) {
            if (err) return cb(err);
            cb(null, user);
        })
    })
};

UserSchema.methods.delToken = function (token, cb) {
    var user = this;
    user.update({ $unset: { token: 1 } }, function (err, user) {
        if (err) return cb(err);
        cb(null, user);
    })
};

module.exports = mongoose.model("User", UserSchema);