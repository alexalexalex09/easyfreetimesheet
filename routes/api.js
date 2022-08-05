var express = require("express");
var router = express.Router();

router.post("/submit", function (req, res, next) {
  res.send({ success: "Submitted" });
});

module.exports = router;
