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
    body("organization").trim().escape().stripLow(),
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
      const curUser = await User.findOne({ profile_id: req.user.id });
      var curOrganization = {};
      if (req.body.organization == "") {
        curOrganization = await Organization.findById(
          curUser.organizations[0]._id
        );
      } else {
        curOrganization = await Organization.findOne({
          code: req.body.organization,
        });
      }
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
  "/getOrg",
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }

    if (!req.body.code) {
      res.send({ err: "Invalid code" });
      return;
    }
    const curUser = await User.findOne({ profile_id: req.user.id })
      .populate("organizations", "code name")
      .exec();
    const organization = await Organization.findOne({
      $and: [{ $match: { owner: curUser._id } }, { code: req.body.code }],
    })
      .populate("owners")
      .populate("approvers")
      .populate("payPeriods")
      .exec();
    const unapprovedPeriods = await PayPeriod.find({
      $and: [{ owner: organization._id }, { fullyApproved: false }],
    })
      .populate("owner", "name code")
      .exec();
    const approvedPeriods = await PayPeriod.find({
      $and: [{ owner: organization._id }, { fullyApproved: true }],
    })
      .populate("owner", "name code")
      .exec();
    toApprove = [];
    upcoming = [];
    const orgHours = await Hours.find({
      organization: organization._id,
    }).exec();
    unapprovedPeriods.forEach(function (period) {
      var start = DateTime.fromJSDate(period.start, { zone: "utc" });
      var end = DateTime.fromJSDate(period.end, { zone: "utc" });
      var index = orgHours.findIndex(function (v) {
        var date = DateTime.fromJSDate(v.date, { zone: "utc" });
        return start <= date && date <= end;
      });
      if (index > -1) {
        toApprove.push(period);
      } else {
        upcoming.push(period);
      }
    });

    User.find({ $match: { organizations: organization._id } })
      .exec()
      .then(function (users, err) {
        if (organization) {
          res.send({
            org: organization,
            users: users,
            approvedPeriods: approvedPeriods,
            toApprove: toApprove,
            upcoming: upcoming,
          });
        } else {
          res.send({ err: "none" });
        }
      });
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
    if (curUser == null || curUser.organizations.length == 0) {
      res.send({ err: "none" });
    } else {
      res.send(curUser.organizations);
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
    const month = dt.month;
    for (var i = month; i <= 12; i++) {
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
        insertOne: {
          document: {
            owner: owner,
            start: start,
            end: end,
            approvedBy: [],
            fullyApproved: false,
          },
        },
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
        insertOne: {
          document: {
            owner: owner,
            start: start,
            end: end,
            approvedBy: [],
            fullyApproved: false,
          },
        },
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
        const theCode = await createOrgCode();
        const newOrg = new Organization({
          name: req.body.name,
          owners: [curUser._id],
          approvers: [curUser._id],
          code: theCode,
          payPeriods: [],
        });
        var theOrg = await newOrg.save();
        var payPeriods = await defaultPayPeriods(theOrg);
        payPeriods = Object.values(payPeriods);
        theOrg.payPeriods = payPeriods;
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

router.post(
  "/getPeriodsWithApprovals",
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    const curUser = await User.findOne({ profile_id: req.user.id })
      .populate("organizations", "code name")
      .exec();
    const periods = await PayPeriod.find({
      owner: { $in: curUser.organizations },
    });
    const unapprovedPeriods = await PayPeriod.find({
      $and: [
        { owner: { $in: curUser.organizations } },
        { _id: { $not: { $in: curUser.approvedPayPeriods } } },
      ],
    })
      .populate("owner", "name code")
      .exec();
    var userApprovedPeriods = await PayPeriod.find({
      $and: [
        { owner: { $in: curUser.organizations } },
        { _id: { $in: curUser.approvedPayPeriods } },
      ],
    })
      .populate("owner", "name code")
      .exec();
    var revokablePeriods = [];
    var approvedPeriods = [];

    //For each period in the user's approved periods list
    userApprovedPeriods.forEach(function (period) {
      if (period.fullyApproved) {
        approvedPeriods.push(period);
      } else {
        revokablePeriods.push(period);
      }
    });
    const curHours = await Hours.find({
      user_profile_id: req.user.id,
    }).populate("organization", "name code");
    const curOrgs = curUser.organizations;
    res.send({
      hours: curHours,
      orgs: curOrgs,
      periods: periods,
      unapprovedPeriods: unapprovedPeriods,
      approvedPeriods: approvedPeriods,
      revokablePeriods: revokablePeriods,
    });
  })
);

router.post(
  "/deleteRecord",
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    Hours.findByIdAndDelete(req.body._id)
      .exec()
      .then(function (theHours, err) {
        if (err) {
          res.send({ err });
        } else {
          Hours.find({ user_profile_id: req.user.id }, "-user -user_profile_id")
            .populate("organization", "code name")
            .exec()
            .then(function (theHours) {
              res.send({ hours: theHours });
            });
        }
      });
  })
);

router.post(
  "/editRecord",
  [
    body("date").isDate(),
    body("hours").isNumeric(),
    body("minutes").isNumeric(),
    body("type").not().isEmpty().trim().escape().stripLow(),
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
      var curHours = await Hours.findById(req.body._id)
        .populate("organization", "code")
        .exec();
      var dt = DateTime.fromISO(req.body.date);
      dt = dt.setZone("utc", { keepLocalTime: true });
      var curOrganization = curHours.Organization;
      if (typeof req.body.organization != "undefined") {
        curOrganization = await Organization.findOne({
          code: req.body.organization,
        });
        curOrganization = curOrganization._id;
      }
      const curUser = await User.findOne({ profile_id: req.user.id });
      curHours.hours = req.body.hours;
      curHours.minutes = req.body.minutes;
      curHours.type = req.body.type;
      curHours.organization = curOrganization;
      curHours.user = curUser._id;
      curHours.user_profile_id = curUser.profile_id;
      curHours.date = dt;
      curHours.save().then(function (curHours, err) {
        if (err) {
          res.send({ err: err });
        } else {
          Hours.find({ user_profile_id: req.user.id }, "-user -user_profile_id")
            .populate("organization", "code name")
            .exec()
            .then(function (theHours) {
              res.send({ hours: theHours });
            });
        }
      });
    }
  })
);

router.post(
  "/approvePeriod",
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    if (!req.body._id) {
      res.send({ err: "Empty Pay Period" });
    }
    var curUser = await User.findOne({ profile_id: req.user.id });
    const index = curUser.approvedPayPeriods.findIndex(function (v) {
      v == req.body._id;
    });
    if (index == -1) {
      curUser.approvedPayPeriods.push(curUser._id);
      curUser.save().then(function (result) {
        res.send(result);
      });
    } else {
      res.send({ err: "Already approved" });
    }
  })
);

router.post(
  "/adminApprovePeriod",
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    if (!req.body.start) {
      res.send({ err: "Empty Pay Period" });
    }
    if (!req.body.org) {
      res.send({ err: "No organization" });
    }
    const curUser = await User.findOne({ profile_id: req.user.id });
    const curOrg = await Organization.findOne({
      $and: [{ code: req.body.org }, { owner: curUser._id }],
    }).exec();
    var curPeriod = await PayPeriod.findOne({
      $and: [{ start: req.body.start }, { owner: curOrg._id }],
    });
    const index = curPeriod.approvedBy.findIndex(function (v) {
      v == curUser._id;
    });
    if (index == -1) {
      curPeriod.approvedBy.push(curUser._id);
      curPeriod.fullyApproved = true;
      curPeriod.save().then(function (result) {
        res.send(result);
      });
    } else {
      res.send({ err: "Already approved" });
    }
  })
);

router.post(
  "/revokePeriod",
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    if (!req.body._id) {
      res.send({ err: "Empty Pay Period" });
    }
    var curUser = await User.findOne({ profile_id: req.user.id });
    const index = curUser.approvedPayPeriods.findIndex(function (v) {
      v == req.body._id;
    });
    if (index != -1) {
      curUser.approvedPayPeriods.splice(index, 1);
      curUser.save().then(function (result) {
        res.send(result);
      });
    } else {
      res.send({ err: "Already approved" });
    }
  })
);

router.post(
  "/adminRevokePeriod",
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    if (!req.body.start) {
      res.send({ err: "Empty Pay Period" });
    }
    if (!req.body.org) {
      res.send({ err: "No organization" });
    }
    const curUser = await User.findOne({ profile_id: req.user.id });
    const curOrg = await Organization.findOne({
      $and: [{ code: req.body.org }, { owner: curUser._id }],
    }).exec();
    var curPeriod = await PayPeriod.findOne({
      $and: [{ start: req.body.start }, { owner: curOrg._id }],
    });
    console.log({ curPeriod });
    console.log(curUser._id);
    const index = curPeriod.approvedBy.findIndex(function (approver) {
      return approver.toString() == curUser._id.toString();
    });
    console.log({ index });
    if (index != -1) {
      curPeriod.approvedBy.splice(index, 1);
      curPeriod.fullyApproved = false;
      curPeriod.save().then(function (result) {
        res.send(result);
      });
    } else {
      res.send({ err: "Not yet approved" });
    }
  })
);

router.post(
  "/getUserDetails",
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    const curUser = await User.findOne({ profile_id: req.user.id })
      .populate("organizations", "name code")
      .populate("approvedPayPeriods")
      .exec();
    res.send({ user: curUser, hours: hoursList });
  })
);

router.post(
  "/getPayPeriodByOrg",
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    const curUser = await User.findOne({ profile_id: req.user.id })
      .populate("approvedPayPeriods")
      .exec();
    const curOrg = await Organization.findOne({
      $and: [{ $match: { owner: curUser._id } }, { code: req.body.code }],
    });
    const startDate = new Date(req.body.startDate);
    const curPeriod = await PayPeriod.findOne({
      $and: [{ start: startDate }, { owner: curOrg._id }],
    });
    var usersList = await User.find({ organization: curOrg._id }).exec();
    const curHours = await Hours.find({ organization: curOrg._id }).populate(
      "user",
      "profile_id displayName"
    );
    const start = DateTime.fromJSDate(curPeriod.start, { zone: "utc" });
    const end = DateTime.fromJSDate(curPeriod.end, { zone: "utc" });
    var users = [];
    usersList.forEach(function (user) {
      var approverIndex = curPeriod.approvedBy.findIndex(function (approver) {
        return approver == user._id;
      });
      users.push({
        displayName: user.displayName,
        profile_id: user.profile_id,
        hours: [],
        approved: approverIndex != -1,
      });
    });
    curHours.forEach(function (v) {
      var date = DateTime.fromJSDate(v.date, { zone: "utc" });
      if (start <= date && date <= end) {
        var index = users.findIndex(function (user) {
          return user.profile_id == v.user.profile_id;
        });
        users[index].hours.push(v);
      }
    });
    res.send({ org: curOrg, users: users, period: curPeriod });
  })
);

module.exports = router;
