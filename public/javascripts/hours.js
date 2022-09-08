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
  const Periods = await getPeriodsWithApprovals();
  const { hours, periods, orgs } = Periods;
  if (orgs.length > 1) {
    orgSelectorInit(hours, periods, orgs);
  }
  createPeriodsList(Periods);
}

function orgSelectorInit(Periods) {
  var htmlString = "";
  orgs.forEach(function (org) {
    htmlString += `<option value="${org.code}">${org.name}</option>`;
  });
  $("#periodsOrg").innerHTML = htmlString;
  $("#periodsSelector").classList.remove("hidden");
  $("#periodsOrg").addEventListener("change", function (e) {
    createPeriodsList(Periods);
  });
}

async function getPeriodsWithApprovals() {
  const Periods = await eftFetch("/api/getPeriodsWithApprovals", {});
  const { hours, orgs, periods } = Periods;
  localforage.setItem("hours", hours);
  localforage.setItem("organizations", orgs);
  storePayPeriods(periods);
  return Periods;
}

function createPeriodsList(Periods) {
  var { hours, orgs, unapprovedPeriods, approvedPeriods, revokablePeriods } =
    Periods;
  htmlString = ``;
  htmlString += getPeriodsHtml(
    unapprovedPeriods,
    hours,
    orgs,
    "unapproved",
    "Approve"
  );
  htmlString += getPeriodsHtml(
    revokablePeriods,
    hours,
    orgs,
    "revokable",
    "Revoke",
    true
  );
  htmlString += getPeriodsHtml(
    approvedPeriods,
    hours,
    orgs,
    "approved",
    "",
    true
  );
  $("#periods").innerHTML = htmlString;
}

function getPeriodsHtml(periods, hours, orgs, type, action, hidden = false) {
  if (periods.length == 0 || hours.length == 0) {
    return `<div class="${type}${hidden ? " hidden" : ""}"></div>`;
  }
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
  periodList.sort(periodSorter(type));
  htmlString += `
  <div class="${type}${hidden ? " hidden" : ""}">`;
  periodList.forEach(function (period) {
    const start = DateTime.fromISO(period.start, {
      zone: "utc",
    });
    const startDate = start.toLocaleString();
    const end = DateTime.fromISO(period.end, { zone: "utc" });
    const endDate = end.toLocaleString();
    var periodHoursList = hoursList.filter(function (v) {
      const dt = DateTime.fromISO(v.date, { zone: "utc" });
      return start <= dt && end >= dt;
    });
    hoursTotal = 0;
    minutesTotal = 0;
    periodHoursList.forEach(function (v) {
      hoursTotal += Number.parseInt(v.hours);
      minutesTotal += Number.parseInt(v.minutes);
    });
    hoursTotal += Math.floor(minutesTotal / 60);
    minutesTotal = minutesTotal % 60;
    minutesTotal = minutesTotal == 0 ? "00" : minutesTotal;
    const date =
      startDate.slice(0, -5) + " - " + endDate.slice(0, -4) + endDate.slice(-2);
    htmlString += `
        <div 
          class="displayPeriod" 
          id="period${period._id}">
          <div class="displayPeriodDates">${date}</div>
          <div class="displayPeriodHours">${hoursTotal}:${minutesTotal}</div>`;
    if (periodHoursList.length > 0) {
      console.log({ periodHoursList });
      periodHoursList = periodHoursList.sort(function (a, b) {
        return (
          DateTime.fromISO(a.date, { zone: "utc" }) -
          DateTime.fromISO(b.date, { zone: "utc" })
        );
      });
      htmlString += `
          <div class="displayHoursDetail calendarModal hidden">
            <div class="displayHoursDetailTitle">${date}</div>
            <div class="displayHoursDetailContainer">`;
      periodHoursList.forEach(function (v) {
        var minutes = v.minutes == 0 ? "00" : v.minutes;
        var hoursDate = DateTime.fromISO(v.date, {
          zone: "utc",
        }).toLocaleString();
        hoursDate = hoursDate.slice(0, -5);
        htmlString += `
              <div class="displayDetailDate">${hoursDate}</div>
              <div class="displayDetailHours">${v.hours}:${minutes}</div>
              <div class="displayPeriodType">${
                v.type.charAt(0).toUpperCase() + v.type.slice(1)
              }</div>
              `;
      });
      htmlString += `
            </div>
          </div>`;
    }
    var viewPeriodDetail = "";
    var approvePeriod = "";
    if (periodHoursList.length > 0) {
      viewPeriodDetail = `viewPeriodDetail('${period._id}')`;
      switch (type) {
        case "unapproved":
          approvePeriod = `approvePeriod('${period._id}')`;
          break;
        case "revokable":
          approvePeriod = `revokePeriod('${period._id}')`;
          break;
        case "approved":
          break;
      }
    }
    htmlString += `
          <button class="viewPeriodDetail" onclick="${viewPeriodDetail}">
            <i class="fa-solid fa-calendar-week"></i>
          </button>
          <button 
            class="approvePeriod${type == "approved" ? " hidden" : ""}" 
            onclick="${approvePeriod}">
            ${action}
          </button>
        </div>
          `;
  });
  htmlString += `</div>`;
  return htmlString;
}

function changeDisplayPeriods() {
  const type = $("#changePeriodType").value;
  $$("#periods>div").forEach(function (v) {
    v.classList.add("hidden");
  });
  $("#periods ." + type).classList.remove("hidden");
}

function approvePeriod(_id) {
  eftFetch("/api/approvePeriod", { _id: _id }, async function (res) {
    const Periods = await getPeriodsWithApprovals();
    createPeriodsList(Periods);
  });
}

function revokePeriod(_id) {
  eftFetch("/api/revokePeriod", { _id: _id }, async function (res) {
    const Periods = await getPeriodsWithApprovals();
    createPeriodsList(Periods);
  });
}

function viewPeriodDetail(_id) {
  $("#period" + _id + " .displayHoursDetail").classList.remove("hidden");
  $("#calendarShadow").classList.remove("hidden");
  console.log("Nothing yet");
}

function closeModals() {
  $$(".calendarModal").forEach(function (el) {
    el.classList.add("hidden");
  });
  $("#calendarShadow").classList.add("hidden");
}
