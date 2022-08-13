require("dotenv").config();
var passport = require("passport");
const express = require("express");
const router = express.Router();

router.get(
  "/login",
  passport.authenticate("google", { scope: ["profile", "email", "openid"] })
);

router.get(
  "/auth/google/callback",
  (req, res, next) => {
    next();
  },
  passport.authenticate("google", {
    failureRedirect: process.env.CLIENT_URL + "?err=cannot_login",
    session: false,
  }),
  function (req, res) {
    req.logIn(req.user, function (err) {
      if (err) {
        console.log("************");
        console.error({ err });
      }
      res.redirect(process.env.CLIENT_URL + "/");
    });
  }
);

router.get("/logout", (req, res) => {
  console.log("Logout");
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

module.exports = router;
