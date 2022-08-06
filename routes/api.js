var express = require("express");
var router = express.Router();
const ash = require("express-async-handler");
const User = require("../models/users");
const Organization = require("../models/organizations");
const PayPeriod = require("../models/payPeriods");
const Hours = require("../models/hours");
const { body, validationResult } = require("express-validator");

function makeid(length = 5, checkList = []) {
  //TODO: Filter out bad words
  var result = "";
  var characters = "ABCEGHJKLMNPQRTUVWXYZ0123456789";
  var charactersLength = characters.length;
  var dup = true;
  do {
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    if (checkList) {
      dup = checkList.findIndex((obj) => obj == result) > -1;
    } else {
      dup = false;
    }
  } while (dup);
  return result;
}

function createOrgCode() {
  return new Promise((resolve, reject) => {
    Organization.find({ code: { $exists: true } }, "code").exec(function (
      err,
      codeList
    ) {
      var theCode = makeid(
        5,
        codeList.map((e) => e.code)
      ); // Make a new code for the session
      codeList = {};
      resolve(theCode);
    });
  });
}

router.post(
  "/submit",
  [
    body("date").isDate(),
    body("hours").isNumeric(),
    body("minutes").isNumeric(),
    body("type").not().isEmpty().trim().escape().stripLow(),
  ],
  ash(async function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.send({ errors: errors.array() });
    } else {
      const curUser = await User.findOne({ profile_id: req.user.id });
      const newHours = new Hours({
        hours: req.body.hours,
        minutes: req.body.minutes,
        type: req.body.type,
        user: curUser._id,
        user_profile_id: curUser.profile_id,
        date: req.body.date,
      });
      newHours.save().then(function (curHours, err) {
        if (err) {
          res.send({ err: err });
        } else {
          res.send({ success: "Submitted" });
        }
      });
    }
  })
);

router.post(
  "/getOrgs",
  ash(async function (req, res, next) {
    const curUser = await User.findOne(
      { profile_id: req.user.id },
      "name organizations"
    )
      .populate("organizations", "name code")
      .exec();
    if (curUser.organizations.length != 0) {
      res.send(curUser.organizations);
    } else {
      res.send({ err: "none" });
    }
  })
);

router.post(
  "/getMyOrgs",
  ash(async function (req, res, next) {
    const curUser = await User.findOne({ profile_id: req.user.id }).exec();
    const orgs = await Organization.find(
      {
        owner: curUser._id,
      },
      "name code"
    ).exec();
    if (orgs.length != 0) {
      res.send(orgs);
    } else {
      res.send({ err: "none" });
    }
  })
);

function defaultPayPeriods(owner) {
  var payPeriodsArray = [];
  const date = new Date(Date.UTC(Date.now()));
  const year = date.getFullYear();
  for (var i = 1; i <= 24; i++) {
    const start = new Date(
      Date.UTC(year, Math.ceil(i / 2) - 1, ((i + 1) % 2) * 15 + 1)
    );
    const next = new Date(
      Date.UTC(year, Math.ceil((i + 1) / 2) - 1, ((i + 2) % 2) * 15 + 1)
    );
    const end = new Date(Date.UTC(next - 1));
    payPeriodsArray.push({ owner: owner, start: start, end: end });
  }
  return payPeriodsArray;
}

//TODO: Sanitize input
router.post(
  "/createOrg",
  [body("name").trim().escape().stripLow()],
  ash(async function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.send({ errors: errors.array() });
    } else {
      if (req.body.name.length <= 0) {
        res.send({ err: "Organization name cannot be blank" });
      } else {
        const curUser = await User.findOne({ profile_id: req.user.id }).exec();
        const theCode = await makeid();
        const newOrg = new Organization({
          name: req.body.name,
          owners: [curUser._id],
          code: theCode,
          approvedPayPeriods: [],
        });
        var theOrg = await newOrg.save();
        theOrg.approvedPayPeriods = defaultPayPeriods();
        await theOrg.save();
        const orgs = await Organization.find({
          owner: curUser._id,
        }).exec();
        res.send(orgs);
      }
    }
  })
);

router.post(
  "/joinOrg",
  ash(async function (req, res, next) {
    curOrganization = await Organization.findOne({
      code: req.body.code,
    }).exec();
    curUser = await User.findOne({ profile_id: req.user.id })
      .populate("organizations", "code")
      .exec();
    if (
      curUser.organizations.findIndex(function (el) {
        return req.body.code == el.code;
      }) == -1
    ) {
      curUser.organizations.push(curOrganization._id);
      await curUser.save();
      res.send({ success: "success" });
    } else {
      res.send({ err: "Already joined" });
    }
  })
);

router.post(
  "/getHours",
  ash(async function (req, res, next) {
    theHours = await Hours.find({ user_profile_id: req.user.id });
    res.send(theHours);
  })
);

module.exports = router;
