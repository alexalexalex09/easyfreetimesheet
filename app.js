require("dotenv").config();
var createError = require("http-errors");
var express = require("express");
require("express-async-errors");
const session = require("express-session");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

const User = require("./models/users.js"); //Need for auth

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var apiRouter = require("./routes/api");
var authRouter = require("./routes/auth");

require("./mongo.js"); //Start the mongo connection
var passport = require("passport"); //Auth
var GoogleStrategy = require("passport-google-oauth20").Strategy; //Auth strategy for passport

var app = express();

// Mongo setup
//Replace MemoryStore
const MongoStore = require("connect-mongo");
var sess = {
  secret: process.env.CONNECT_MONGO_SECRET,
  saveUninitialized: true, // create session before something stored
  resave: false, //don't save session if unmodified
  store: MongoStore.create({
    mongoUrl: process.env.mongo,
    touchAfter: 60 * 5,
    collectionName: "mongoSessions",
  }),
  touchAfter: 60 * 5,
  collectionName: "mongoSessions",
  cookie: {},
};
if (app.get("env") === "production") {
  // Use secure cookies in production (requires SSL/TLS)
  sess.cookie.secure = true;

  // Uncomment the line below if your application is behind a proxy (like on Heroku)
  // or if you're encountering the error message:
  // "Unable to verify authorization request state"
  app.set("trust proxy", 1);
}
app.use(session(sess));

User.findOne({})
  .exec()
  .then(function (curUser) {
    console.log({ curUser });
  });

//Auth
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOneAndUpdate(
        { profile_id: profile.id },
        {
          $set: {
            profile_id: profile.id,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            displayName: profile.displayName,
          },
        },
        { upsert: true }
      ).exec(function (err, curUser) {
        return cb(err, profile);
      });
    }
  )
);
app.use(passport.initialize());
app.use(passport.session());
/*
//Use HTTPS if appropriate
app.get("*", async function (req, res, next) {
  if (req.headers.host.indexOf(":3000") == -1 && !req.secure) {
    res.redirect("https://" + req.headers.host + req.url);
  } else {
    next();
  }
});
*/
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  console.log("App is using:");
  var user = req.user;
  console.log({ user });
  if (req.user) {
    res.locals.user = req.user;
  }
  next();
});

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/api", apiRouter);
app.use("/", authRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
