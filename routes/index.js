var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Timecard.live" });
});

router.get("/myOrgs", function (req, res, next) {
  res.render("myOrgs", { title: "Timecard.live" });
});

router.get("/hours", function (req, res, next) {
  res.render("hours", { title: "Timecard.live" });
});

router.get("/calendar", function (req, res, next) {
  res.render("calendar", { title: "Timecard.live" });
});

router.get("/privacy-tos", function (req, res, next) {
  res.render("privacy-tos", { title: "Timecard.live" });
});

module.exports = router;
