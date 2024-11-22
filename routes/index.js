var express = require('express');
const app = express()
var router = express.Router();
var mongoose = require('mongoose');
const path = require('path');
const fs = require('fs')
const mailer = require("../nodemailer")
const bcrypt = require("bcrypt");
const userModel = require('./users');
const passport = require('passport');
const File = require("../models/fileSchema");
const multer = require("multer");
const { check, validationResult } = require('express-validator');
const ffmpeg = require('fluent-ffmpeg');
const generateThumbnail = require('./thumbnailGenerator');


const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/files/");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `storm-${file.fieldname}-${Date.now()}.${ext}`);
  },
});


const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 1024 * 1024 * 100, 
  }
});

function multerFileSizeLimitError(err, req, res, next) {
  if (err.code === "LIMIT_FILE_SIZE") {
    // return res.status(413).json({ error: "File size exceeds the limit (max 100 MB)" });
    const filesize ={key1: "File size exceeds the limit (max 100 MB)"};
      req.flash('filesize', filesize)
      res.redirect('/feed')
  }
  next(err);
}

// function fileVerify(file, res){
//   if(req.file === undefined){
//     res.redirect('/feed')
//   }
// }


function fileDelete(filePath){
  fs.unlink(filePath, function(err){
    if(err){
      console.log("Error deleting file", err);
    }
    else{
      console.log("File deleted successfully", filePath);
    }
  });
}

function deleteThumbnail(thumbnailPath){
  fs.unlink(thumbnailPath, function(err){
    if(err){
      console.log("Error deleting file", err);
    }
    else{
      console.log("File deleted successfully", thumbnailPath);
    }
  });
}

function scheduleFileDeletion(fileId, filePath, deletionTime, userId, thumbnailPath) {
  const currentTime = Date.now();
  const timeUntilDeletion = deletionTime - currentTime;



  if (timeUntilDeletion > 0) {
    setTimeout(async function () {
      await fileDelete(filePath);
      await deleteThumbnail(thumbnailPath)

      try {
        await File.findByIdAndRemove(fileId).exec();
        await userModel.findOneAndUpdate({_id: userId},{ $inc: { maxUploads: +1 } }, {new: true}).exec();
        await userModel.findOneAndUpdate({_id: userId},{ $pull: { files: fileId } }, {new: true}).exec();
        console.log("File entry removed successfully", fileId);
      } catch (err) {
        console.log("Error removing file entry from database", err);
      }
    }, timeUntilDeletion);
  } else {
    deleteFile(filePath);
    deleteThumbnail(thumbnailPath)
    File.findByIdAndRemove(fileId).exec()
      .then(function() {
        console.log("File entry removed successfully", fileId);
      })
      .catch(function(err) {
        console.log("Error removing file entry from database", err);
      });
  }
}



router.get('/', function(req,res,next){
  res.redirect('/login')
})


router.post("/register", function (req, res) {
  const userData = new userModel({
    name: req.body.name,
    email: req.body.email,
    username: req.body.username
  })
  console.log(userData)
  userModel.register(userData, req.body.password)
    .then(function (registeredUser) {
      passport.authenticate('local')(req, res, function () {
        res.redirect("/feed");
      })
    })
    .catch(function (err) {
      console.log(err); 
      res.redirect("/register");
    })
});

router.post("/login", passport.authenticate('local', {
  successRedirect: "/feed",
  failureRedirect: "/login"
}), function (req, res) { })

router.get("/logout", function (req, res) {
  req.logOut(function(err){
    if(err) throw err;
    res.redirect("/login")
  });
})

router.get("/profile", isLoggedIn, function (req, res) {
  const user = req.user;
  res.render("profile", {user});
})

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login")
}

// function passwordVerified(){
//   var alreadyAccessed = true;
// };

router.get("/login", function (req, res, next) {
  if(req.isAuthenticated()){
    res.redirect('/feed')
  }
  else{
    res.render("login");
  }
})

router.get("/register", function (req, res) {
  if(req.isAuthenticated()){
    res.redirect('/feed')
  }
  else{
    res.render("registeruser");
  }
})

router.get('/feed', isLoggedIn, function(req,res,next){
  const filesize = req.flash('filesize')[0];
  let uploadLimit = req.user.maxUploads
  if(req.user.maxUploads === 0){
    res.render('feed', {filesize, uploadForm: false, maxUploadMessage: true, uploadLimit})
  }
  else{
    res.render('feed', {filesize, uploadForm: true, maxUploadMessage: false, uploadLimit})
  }
})

router.post("/api/uploadFile", isLoggedIn, upload.single("myFile"), async function(req, res)  {
  // Stuff to be added later
  // console.log(req.file);
  if (!req.file) {
    return res.redirect("/feed");
  }
  if(req.user.maxUploads === 0){
    const filesize = req.flash('filesize')[0];
    return res.redirect('/feed')
  }
  // console.log(req.user)

  const user = await userModel

  const setPassword = req.body.setPassword === "on";

  let encryptedPassword;
  if(setPassword){
    const password =  req.body.filePassword;
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    encryptedPassword = await bcrypt.hash(password, salt);
    hasPassword = true
  } else {
    hasPassword = false
    encryptedPassword = "";
  }

  if(!req.body.title){
    req.body.title = "Untitled"
  }

  // const originalString = req.file.filename;
  // const thumbnailP = originalString.replace(/^files\//, '');


  const videoPath = req.file.path; // Path to the uploaded video file
  const thumbnailPath = path.join('public/thumbnails/', req.file.filename + '.png'); // Path to save the thumbnail
  const thumbnailPathDB = path.join('/thumbnails/', req.file.filename + '.png')
  generateThumbnail(videoPath, thumbnailPath, function (err) {
    if (err) {
      // Handle thumbnail generation error
      console.error('Error generating thumbnail:', err);
      return res.status(500).send('Error generating thumbnail');
    }
  });

  try {
    const newFile = await File.create({
      name: req.file.filename,
      title: req.body.title,
      URL: Math.random().toString(36).slice(2),
      uploadedBy: req.user.username,
      filePassword: encryptedPassword,
      hasPassword: hasPassword,
      thumbnail: thumbnailPathDB
    });

    console.log(req.body.title)
    
    // console.log(newFile)
    const fileId = newFile._id;
    const filePath = `public\\files\\${newFile.name}`;
    const deletionTime = Date.now() + 60 * 1000
    const userId = req.user._id
    console.log(req.user._id)

    await userModel.findOneAndUpdate({_id: req.user.id},{$push: {files: fileId}}, {new: true}).exec();

    await userModel.findOneAndUpdate({_id: req.user.id},{ $inc: { maxUploads: -1 } }, {new: true}).exec()

    scheduleFileDeletion(fileId, filePath, deletionTime, userId, thumbnailPath);

    // const urlForLink = await File.findOne(newFile.name).exec();
    // console.log(urlForLink)

    const urlGenerate ={key1: await File.findById(newFile._id).exec()};

    req.flash('dataToPass', urlGenerate)

    res.redirect('/feed/uploadcomplete')

    // res.status(200).json({
    //   status: "success",
    //   message: "File created successfully!!",
    // });
  }

  
  
  catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while uploading the file.",
    });
  }
});

router.get('/feed/video/:URL', async function(req,res,next){
  const passwordcheck = await File.findOne({URL: `${req.params.URL}`}).exec();
  // const hasPassword = passwordcheck.hasPassword
  if(passwordcheck === null){
    res.send("Invalid URL")
  }
  else if(passwordcheck.hasPassword === true){
    
    const data = req.flash('data')[0];
    res.render('passwordverify',{passwordcheck, data})
  }
  else {
    const cachefile = await File.findOne({URL: `${req.params.URL}`}).exec();
    console.log(cachefile.URL)
    console.log(cachefile.name)
    res.render('video',{cachefile})
  }
  // if(passwordcheck.){}
//  try{
//  const cachefile = await File.findOne({URL: `${req.params.URL}`}).exec();
//     console.log(cachefile.URL)
//     console.log(cachefile.name)
//     res.render('video',{cachefile})
// } catch(err){
//   console.log(err)
//  }
})

router.post('/feed/video/verify/:URL', async function(req,res,next){
  const enteredpassword = req.body.filepassword
  const cachefile = await File.findOne({URL: `${req.params.URL}`}).exec();
  console.log(cachefile.filePassword)
  const hash = cachefile.filePassword
  await bcrypt.compare(enteredpassword, hash, function(err, result) {
    if(result === true){
      res.render('video',{cachefile})
      console.log(result)
      // passwordVerified();
    }
    // else if(alreadyAccessed === true){
    //   res.render('video',{cachefile})
    // }
    else{
      // res.send('wrong password buddy')
      const errpass ={key1: "Incorrect Password"};
      req.flash('data', errpass)
      res.redirect(`/feed/video/${cachefile.URL}`)
      console.log(result)
    }
});
})


router.get('/feed/uploadcomplete', function(req,res,next){
  const data = req.flash('dataToPass')[0];
  res.render('uploadcomplete', {data})
})

router.get('/account_recovery', function(req,res,next){
  // const emailnotfound = req.flash('emailnotfound')
  res.render('recovery')
})

let otp;

router.post('/account_recovery', async function(req,res,next){
  console.log(req.body.email)
  const user = req.body.email;
  const email = await userModel.findOne({email: `${user}`}).exec();
  if(email === null){
    const emailnotfound = req.flash('emailnotfound', "The email you entered does'nt exist, Please enter a valid email")
    // console.log(emailnotfound)
    res.render('recovery', {emailnotfound: req.flash('emailnotfound')})
  }
  else{
  // console.log(email)
  otp = Math.floor(1000 + Math.random() * 9000);
  setTimeout(function() {
    otp = '';
    console.log("otp expired")
  }, 120 * 1000);
  mailer(email.email, otp).then(() => {
    req.session.email = email.email;
    res.render('otp', { showOtpForm: true , falseOTP: false});
  }) 
  }
})

router.post('/account_recovery/verify', function(req,res,next){
  console.log(otp)
  console.log(req.body.otp)
  if(req.body.otp == otp){
    const email = req.body.email;
    res.render('passwordreset.ejs', { email,  errors: []})
    otp = ''
    console.log("OTP Verified")
  }
  else{
    res.render("otp", {showOtpForm: true, falseOTP: true})
  }
  
})

router.post('/account_recovery/verify/resetpassword', [
  // Validate the newPassword field
  check('newPassword')
    .trim()
    .notEmpty()
    .withMessage('New password is required.')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.'),

  // Validate the confirmNewPassword field
  check('confirmNewPassword')
    .trim()
    .notEmpty()
    .withMessage('Confirm new password is required.')
    .custom((value, { req }) => {
      // Check if the confirm password matches the new password
      if (value !== req.body.newPassword) {
        throw new Error('Passwords does not match');
      }
      return true;
    }),
], async function(req,res,next){
  const email = req.session.email
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // If there are validation errors, render the form again with the errors
    return res.render('passwordreset', { errors: errors.array() });
  }
  // console.log(req.session.email)
  try{
    const userDetails = await userModel.findOne({email: `${email}`}).exec();
    if (!userDetails) {
      return res.status(404).send("User not found");
    }

    await userDetails.setPassword(req.body.newPassword);
    await userDetails.save();

      // Redirect to a success page or send a success message
      res.send("Password updated successfully, Login to continue");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while updating the password");
  }
})

router.get('/uploads', isLoggedIn, async function(req,res,next){
  let uplodedVideos = req.user.files;
  var findfiles = await File.find({'_id':{ $in: uplodedVideos}}).exec();
  var fileArray;
  // findfiles.forEach(function(elem){
  //   fileArray = elem
  //   console.log(fileArray)
  //   res.render('uploads', {fileArray});
  // })
  // console.log(fileArray);
  res.render('uploads', {findfiles})
})

// router.use(fileVerify)
router.use(multerFileSizeLimitError);
module.exports = router;