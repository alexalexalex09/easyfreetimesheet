var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Easy Free Timesheet" });
});

router.get("/myOrgs", function (req, res, next) {
  res.render("myOrgs", { title: "Easy Free Timesheet" });
});

router.get("/hours", function (req, res, next) {
  res.render("hours", { title: "Easy Free Timesheet" });
});

module.exports = router;
