var express = require("express");
var router = express.Router();
const ash = require("express-async-handler");
const User = require("../models/users");
const Organization = require("../models/organizations");
const PayPeriod = require("../models/payPeriods");
const Hours = require("../models/hours");
const { body, validationResult } = require("express-validator");
const { Settings, DateTime } = require("luxon");
Settings.defaultZoneName = "utc";

const ERR_LOGIN = { err: "Not logged in" };

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
    body("organization").not().isEmpty().trim().escape().stripLow(),
  ],
  ash(async function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.send({ err: errors.array()[0] });
      return;
    } else {
      if (req.body.hours == 0 && req.body.minutes == 0) {
        res.send({ err: "No time recorded!" });
      }
      if (!req.user) {
        res.send(ERR_LOGIN);
      }
      var dt = DateTime.fromISO(req.body.date);
      dt = dt.setZone("utc", { keepLocalTime: true });
      const curOrganization = await Organization.findOne({
        code: req.body.organization,
      });
      const curUser = await User.findOne({ profile_id: req.user.id });
      const newHours = new Hours({
        hours: req.body.hours,
        minutes: req.body.minutes,
        type: req.body.type,
        organization: curOrganization,
        user: curUser._id,
        user_profile_id: curUser.profile_id,
        date: dt,
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
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
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
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
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
  let promise = new Promise(function (resolve, reject) {
    var payPeriodsArray = [];
    var dt = DateTime.now();
    const year = dt.year;
    for (var i = 1; i <= 12; i++) {
      var start = DateTime.fromObject(
        {
          year: year,
          month: i,
          day: 1,
        },
        { zone: "utc" }
      );
      var end = DateTime.fromObject(
        {
          year: year,
          month: i,
          day: 15,
        },
        { zone: "utc" }
      );
      console.log({ start });
      start = new Date(start.toISO());
      console.log({ start });
      end = new Date(end.toISO());
      payPeriodsArray.push({
        insertOne: { document: { owner: owner, start: start, end: end } },
      });
      start = DateTime.fromObject(
        {
          year: year,
          month: i,
          day: 16,
        },
        { zone: "utc" }
      );
      end = start.endOf("month");
      start = new Date(start.toISO());
      end = new Date(end.toISO());
      payPeriodsArray.push({
        insertOne: { document: { owner: owner, start: start, end: end } },
      });
    }
    PayPeriod.bulkWrite(payPeriodsArray).then(
      function (payPeriods) {
        resolve(payPeriods.insertedIds);
      },
      function (err) {
        console.log({ payPeriodsArray });
        console.log({ err });
      }
    );
  });
  return promise;
}

router.post(
  "/createOrg",
  [body("name").trim().escape().stripLow()],
  ash(async function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.send({ errors: errors.array() });
    }
    if (req.body.name.length <= 0) {
      res.send({ err: "Organization name cannot be blank" });
    } else {
      if (!req.user) {
        res.send(ERR_LOGIN);
        return;
      } else {
        const curUser = await User.findOne({
          profile_id: req.user.id,
        }).exec();
        const theCode = await makeid();
        const newOrg = new Organization({
          name: req.body.name,
          owners: [curUser._id],
          code: theCode,
          approvedPayPeriods: {
            users: [],
            payPeriods: [],
          },
        });
        var theOrg = await newOrg.save();
        var payPeriods = await defaultPayPeriods(theOrg);
        payPeriods = Object.values(payPeriods);
        theOrg.approvedPayPeriods.payPeriods = payPeriods;
        var err = await theOrg.save();
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
  [body("code").trim().escape().stripLow()],
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    } else {
      if (req.body.code.length < 5) {
        res.send({ err: "Invalid code" });
      }
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
    }
  })
);

router.post(
  "/getHours",
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    theHours = await Hours.find(
      { user_profile_id: req.user.id },
      "-user -user_profile_id"
    )
      .populate("organization", "code name")
      .exec();
    res.send(theHours);
  })
);

router.post(
  "/getPeriods",
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    const curUser = await User.findOne({ profile_id: req.user.id })
      .populate("organizations", "code")
      .exec();
    const curPeriods = await PayPeriod.find({
      owner: { $in: curUser.organizations },
    })
      .populate("owner", "name code")
      .exec();
    res.send(curPeriods);
  })
);

module.exports = router;
