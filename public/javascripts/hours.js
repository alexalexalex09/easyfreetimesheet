if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = document.querySelectorAll;
}

window.addEventListener("load", function () {
  DateTime = luxon.DateTime;
  periodsListInit();
});

async function periodsListInit() {
  const { hours, periods, orgs } = await getNewUnapprovedPeriods();
  if (orgs.length > 1) {
    orgSelectorInit(hours, periods, orgs);
  }
  showPeriodsList(hours, periods, orgs);
}

function orgSelectorInit(hours, periods, orgs) {
  var htmlString = "";
  orgs.forEach(function (org) {
    htmlString += `<option value="${org.code}">${org.name}</option>`;
  });
  $("#periodsOrg").innerHTML = htmlString;
  $("#periodsOrg").classList.remove("hidden");
  $("#periodsOrg").addEventListener("change", function (e) {
    showPeriodsList(hours, periods, orgs);
  });
}

async function getNewUnapprovedPeriods() {
  const { hours, periods, orgs } = await efsFetch(
    "/api/getUnapprovedPeriods",
    {}
  );
  localforage.setItem("hours", hours);
  localforage.setItem("organizations", orgs);
  storePayPeriods(periods);
  return { hours: hours, periods: periods, orgs: orgs };
}

function showPeriodsList(hours, periods, orgs) {
  console.log("showPeriodsList");
  htmlString = ``;
  var hoursList = [];
  var periodList = [];
  if (orgs.length > 1) {
    hoursList = hours.filter(function (v) {
      return v.organization.code == $("#periodsOrg").value;
    });
    periodList = periods.filter(function (v) {
      return v.owner.code == $("#periodsOrg").value;
    });
  } else {
    hoursList = hours;
    periodList = periods;
  }
  periodList.sort(function (a, b) {
    return (
      DateTime.fromISO(a.start, { zone: "utc" }) -
      DateTime.fromISO(b.start, { zone: "utc" })
    );
  });
  periodList.forEach(function (period) {
    const start = DateTime.fromISO(period.start, {
      zone: "utc",
    });
    const startDate = start.toLocaleString();
    const end = DateTime.fromISO(period.end, { zone: "utc" });
    const endDate = end.toLocaleString();
    console.log("**");
    console.log(
      start.month + "/" + start.day + "-" + end.month + "/" + end.day
    );
    var periodHoursList = hoursList.filter(function (v) {
      const dt = DateTime.fromISO(v.date, { zone: "utc" });
      console.log(dt.month + "/" + dt.day + (start <= dt && end >= dt));
      return start <= dt && end >= dt;
    });
    console.log("--");
    hoursTotal = 0;
    minutesTotal = 0;
    periodHoursList.forEach(function (v) {
      hoursTotal += Number.parseInt(v.hours);
      minutesTotal += Number.parseInt(v.minutes);
    });
    hoursTotal += Math.floor(minutesTotal / 60);
    minutesTotal = minutesTotal % 60;
    minutesTotal = minutesTotal == 0 ? "00" : minutesTotal;
    htmlString += `
      <div class="displayPeriod">
        <div class="displayPeriodDates">${startDate.slice(
          0,
          -5
        )} - ${endDate.slice(0, -5)}</div>
        <div class="displayPeriodHours">${hoursTotal}:${minutesTotal}</div>
        <button class="viewPeriodDetail" onclick="viewPeriodDetail('${
          period._id
        }')"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="approvePeriod" onclick="approvePeriod('${
          period._id
        }')">Approve</button>
      </div>
      `;
  });
  $("#periods").innerHTML = htmlString;
}

function approvePeriod(_id) {
  efsFetch("/api/approvePeriod", { _id: _id }, async function (res) {
    const { hours, periods, orgs } = await getNewUnapprovedPeriods();
    showPeriodsList(hours, periods, orgs);
  });
}
