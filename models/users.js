var mongoose = require("mongoose");
var plm = require('passport-local-mongoose');

// mongoose.connect("mongodb://localhost/VideoStreaming");

var userSchema = mongoose.Schema({
    name: String,
    username: String,
    email: String,
    password: String
});

userSchema.plugin(plm);

module.exports = mongoose.model("user", userSchema);