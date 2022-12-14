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

/**
 * @param code an organization's code
 */
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
      $and: [{ owner: curUser._id }, { code: req.body.code }],
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

    User.find({ organizations: organization._id }, { _id: 0 })
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
          res.send({ err: "No user found" });
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
      res.send({ err: "No organization found" });
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
        owners: curUser._id,
      },
      "name code"
    ).exec();
    if (orgs.length != 0) {
      res.send(orgs);
    } else {
      res.send({ err: "No organizations" });
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
      var dueDate = end.plus({ days: 7 });
      start = new Date(start.toISO());
      end = new Date(end.toISO());
      dueDate = new Date(dueDate.toISO());
      payPeriodsArray.push({
        insertOne: {
          document: {
            owner: owner,
            start: start,
            end: end,
            dueDate: dueDate,
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
      dueDate = end.plus({ days: 7 });
      start = new Date(start.toISO());
      end = new Date(end.toISO());
      dueDate = new Date(dueDate.toISO());
      payPeriodsArray.push({
        insertOne: {
          document: {
            owner: owner,
            start: start,
            end: end,
            dueDate: dueDate,
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
      var firstOrg = false;
      if (curUser.organizations.length == 0) {
        firstOrg = true;
      }
      if (curOrganization == null || curUser == null) {
        res.send({ err: "Invalid" });
      }
      if (
        curUser.organizations.findIndex(function (el) {
          return req.body.code == el.code;
        }) == -1
      ) {
        curUser.organizations.push(curOrganization._id);
        await curUser.save();
        if (firstOrg) {
          var curHours = await Hours.find({ user: curUser._id }).exec();
          if (curHours.length > 0) {
            curHours.forEach(function (hours) {
              hours.organization = curOrganization._id;
              hours.save();
            });
          }
        }
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
    console.log({ theHours });
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
    console.log({ userApprovedPeriods });
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
      curUser.approvedPayPeriods.push(req.body._id);
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

/**
 * @param start pay period start date
 * @param org org code
 */
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
    console.log(curUser._id.toString());
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

/**
 * @param code organization code
 * @param startDate
 *
 */
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
      $and: [{ owner: curUser._id }, { code: req.body.code }],
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
          return user.profile_id == v.user_profile_id;
        });
        users[index].hours.push(v);
      }
    });
    res.send({ org: curOrg, users: users, period: curPeriod });
  })
);

/**
 * @param userId user's internalId
 * @param code organization code
 */
router.post(
  "/removeUserFromOrg",
  ash(async function (req, res, next) {
    console.log("Removing");
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    const curUser = await User.findOne({ profile_id: req.user.id });
    var userToRemove = await User.findOne({ internalId: req.body.userId });
    var curOrganization = await Organization.findOne({ code: req.body.code });
    var curUserIsOwner = curOrganization.owners.indexOf(curUser._id) > -1;
    if (!curUserIsOwner) {
      res.send({
        err: "Currently logged in user does not own the appropriate organization",
      });
    }
    var index = userToRemove.organizations.indexOf(curOrganization._id);
    if (index == -1) {
      res.send({ err: "User does not belong to this organization" });
    }
    userToRemove.organizations.splice(index, 1);
    await userToRemove.save();
    const users = await User.find(
      { organizations: curOrganization._id },
      { _id: 0 }
    ).exec();
    console.log(typeof users);
    console.log({ users });
    res.send(users);
  })
);

/**
 * @param orgCode
 * @param userCode
 */
router.post(
  "/getOrgUser",
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    const curUser = await User.findOne({ profile_id: req.user.id });
    const curOrganization = await Organization.findOne({
      code: req.body.orgCode,
    });
    const ownsOrg = curOrganization.owners.indexOf(curUser._id);
    if (ownsOrg == -1) {
      res.send({ err: "You are not an owner of this organization" });
    }
    const theUser = await User.findOne({ internalId: req.body.userCode });
    const userInOrg = theUser.organizations.indexOf(curOrganization._id);
    if (userInOrg == -1) {
      res.send({ err: "This user is not in your organization" });
    }
    const returnUser = await User.findOne(
      { _id: theUser._id },
      { _id: 0, organizations: 0, profile_id: 0 }
    );

    const periods = await PayPeriod.find({
      owner: curOrganization._id,
    });
    const unapprovedPeriods = await PayPeriod.find({
      $and: [
        { owner: curOrganization._id },
        { _id: { $not: { $in: theUser.approvedPayPeriods } } },
      ],
    })
      .populate("owner", "name code")
      .exec();
    const userApprovedPeriods = await PayPeriod.find({
      $and: [
        { owner: curOrganization._id },
        { _id: { $in: theUser.approvedPayPeriods } },
      ],
    })
      .populate("owner", "name code")
      .exec();
    const curHours = await Hours.find(
      {
        $and: [
          { user_profile_id: theUser.profile_id },
          { organization: curOrganization._id },
        ],
      },
      { user: 0, user_profile_id: 0 }
    ).populate("organization", "name code");

    res.send({
      user: returnUser,
      hours: curHours,
      periods: periods,
      unapprovedPeriods: unapprovedPeriods,
      userApprovedPeriods: userApprovedPeriods,
    });
  })
);

/**
 * @param user the user's code
 * @param maxYearly
 * @param regularHours
 * @param vacation
 * @param period
 */
router.post(
  "/editUserHours",
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    const theOrg = await Organization.findOne({ owner: req.user._id });
    var theUser = await User.findOne({ internal_id: req.body.user }).exec();
    if (theUser.organizations.indexOf(theOrg._id) == -1) {
      res.send({ err: "User is not in your organization" });
    }
    console.log({ theUser });
    console.log(theUser.internalId);
    console.log(theUser.hourLimits);
    console.log(Object.keys(theUser));
    if (["day", "week", "month", "year"].indexOf(req.body.period != -1)) {
      theUser.hourLimits.period = req.body.period;
    }
    theUser.hourLimits.maxYearly = req.body.maxYearly;
    theUser.hourLimits.regularHours = req.body.regularHours;
    theUser.hourLimits.vacation = req.body.vacation;
    theUser.save().then(function (user) {
      res.send({
        maxYearly: user.hourLimits.maxYearly,
        regularHours: user.hourLimits.regularHours,
        vacation: user.hourLimits.vacation,
        period: user.hourLimits.period,
      });
    });
  })
);

/**
 * @param username
 */
router.post(
  "/editUserName",
  [body("username").not().isEmpty().trim().escape().stripLow()],
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    const theOrg = await Organization.findOne({ owner: req.user._id }).exec();
    var theUser = await User.findOne({ internal_id: req.body.user }).exec();
    if (theUser.organizations.indexOf(theOrg._id) == -1) {
      res.send({ err: "User is not in your organization" });
    }
    theUser.displayName = req.body.username;
    theUser.save();
    res.send({ username: req.body.username });
  })
);

/**
 * @param periods
 */
router.post(
  "/addPeriods",
  ash(async function (req, res, next) {
    if (!req.user) {
      res.send(ERR_LOGIN);
      return;
    }
    const periods = Number(req.body.periods);
    if (periods == "NaN") {
      res.send({
        err: "Number of periods not specified correctly: " + typeof periods,
      });
    }
    if (periods < 1) {
      res.send({ err: "Number of periods to add must be greater than 0" });
    }
    const theOrg = await Organization.findOne({ owner: req.user._id }).exec();
    const payPeriods = await PayPeriod.find({ owner: theOrg._id }).exec();
    const payPeriodsSorted = [...payPeriods].sort(function (a, b) {
      return (
        DateTime.fromJSDate(b.start, { zone: "utc" }) -
        DateTime.fromJSDate(a.start, { zone: "utc" })
      );
    });
    const finalPayPeriod = payPeriodsSorted[0];
    var start = DateTime.fromJSDate(finalPayPeriod.end);
    for (var i = 0; i < periods; i++) {
      start = await addPayPeriod(theOrg, start.plus({ day: 1 }));
      console.log({ start });
    }
    res.send({ success: `Added ${i} pay periods` });
  })
);

async function addPayPeriod(owner, start) {
  console.log("Day:" + start.day);
  var end = start.set({ day: 1 });
  if (start.day == 16) {
    end = start.plus({ month: 1 });
    end = end.set({ day: 1 });
    end = end.minus({ day: 1 });
  } else {
    end = start.set({ day: 15 });
  }
  var due = end.plus({ days: 7 });
  startDate = new Date(start.toISO());
  endDate = new Date(end.toISO());
  dueDate = new Date(due.toISO());
  console.log({
    start: startDate,
    end: endDate,
    dueDate: dueDate,
    approvedBy: [],
    fullyApproved: false,
  });
  await PayPeriod.create({
    owner: owner,
    start: startDate,
    end: endDate,
    dueDate: dueDate,
    approvedBy: [],
    fullyApproved: false,
  });
  return end;
}

module.exports = router;
