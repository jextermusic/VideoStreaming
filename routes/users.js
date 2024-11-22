var mongoose = require("mongoose");
var plm = require('passport-local-mongoose');

// mongoose.connect("mongodb://localhost/VideoStreaming");

var userSchema = mongoose.Schema({
    name: String,
    email: String,
    username: String,
    password: String,
    maxUploads: {
        type: Number,
        default: 5
      },
      files:[{
        type: String,
      }]
});

userSchema.plugin(plm);

module.exports = mongoose.model("user", userSchema);