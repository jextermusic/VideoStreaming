
const mongoose = require("mongoose");


const fileSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now,
  },
  name: {
    type: String,
    required: [true, "Uploaded file must have a name"],
  },
  title: {
    type: String,
    default: "Untitled"
  },
  URL: {
    type: String,
    default: Math.random().toString(36).slice(2)
  },
  uploadedBy: {
    type: String
  },
  hasPassword: {
    type: Boolean,
    default: false
  },
  filePassword: String,
  thumbnail:{
    type: String,
  }
});


const File = mongoose.model("File", fileSchema);


module.exports = File;