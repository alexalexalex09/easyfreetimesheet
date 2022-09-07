var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Timecard.live" });
});

router.get("/myOrgs", function (req, res, next) {
  res.render("myOrgs", { title: "Timecard.live" });
});

router.get("/myOrgs/:orgCode", (req, res) => {
  var orgCode = req.params.orgCode.toUpperCase();
  res.render("orgPage", {
    orgCode: orgCode,
  });
});

router.get("/myOrgs/:orgCode/payperiod/:startDate", (req, res) => {
  var orgCode = req.params.orgCode.toUpperCase();
  var startDate = req.params.startDate + "T00:00:00.000Z";
  res.render("payPeriodPage", {
    orgCode: orgCode,
    startDate: startDate,
  });
});

router.get("/myOrgs/:orgCode/user/:userCode", (req, res) => {
  var orgCode = req.params.orgCode.toUpperCase();
  var userCode = req.params.userCode.toUpperCase();
  res.render("userPage", {
    orgCode: orgCode,
    userCode: userCode,
  });
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
