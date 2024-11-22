var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const nodemailer = require("nodemailer");
var bodyParser = require('body-parser')
var mongoose = require('mongoose')
var expressSession = require('express-session')
const userModel = require('./routes/users')
const { check, validationResult } = require('express-validator');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const passport = require('passport');
const localStrategy = require("passport-local")
const fs = require('fs')
const flash = require('connect-flash');

var app = express();

app.use(expressSession({
  resave: false,
  saveUninitialized: false,
  secret: 'jexterapp'
}));

app.use(flash());

app.use((req, res, next) => {
  res.locals.emailnotfound = req.flash('emailnotfound');
  next();
});

app.use(passport.initialize());
app.use(passport.session());


passport.use(new localStrategy(userModel.authenticate()));
passport.serializeUser(userModel.serializeUser());
passport.deserializeUser(userModel.deserializeUser());
 
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// process.on("uncaughtException", (err) => {
//   console.log("UNCAUGHT EXCEPTION, APP SHUTTING NOW!!");
//   console.log(err.message, err.name);
//   process.exit(1);
// });

const DB = "mongodb://127.0.0.1:27017/VideoStreaming";

mongoose
  .connect(DB, {
    // useCreateIndex: true,
    // useFindAndModify: true,
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
    autoIndex: true,
  })
  .then(() => {
    console.log("DB connected successfully");
  });

module.exports = app;
