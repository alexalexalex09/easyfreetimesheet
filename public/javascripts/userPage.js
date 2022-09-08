if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = (selector) => document.querySelectorAll(selector);
}

const userCode = window.location.pathname
  .slice(window.location.pathname.lastIndexOf("/") + 1)
  .toUpperCase();
const orgCode = window.location.pathname.slice(
  window.location.pathname.indexOf("myOrgs") + 7,
  window.location.pathname.indexOf("myOrgs") + 12
);

window.addEventListener("load", function () {
  DateTime = luxon.DateTime;
  eftFetch("/api/getOrgUser", {
    userCode: userCode,
    orgCode: orgCode,
  }).then(function (ret) {
    const user = ret.user;
    $("#userTitle").innerHTML = user.displayName;
    var htmlString = `
    <div id="yearlyHours">0/${user.hourLimits.maxYearly}</div>
    <div id="vacationHours">0/${user.hourLimits.vacation}</div>
    <div id="regularHours">${user.hourLimits.regularHours} hours per week</div>
    `;
    $("#hoursUsed").innerHTML = htmlString;
    htmlString = ``;
    displayPayPeriod(
      ret.unapprovedPeriods,
      ret.hours,
      "unapproved",
      "#userToApprove"
    );
    displayPayPeriod(
      ret.userApprovedPeriods,
      ret.hours,
      "approved",
      "#userApproved"
    );
  });
});

function displayPayPeriod(periods, hours, type, element) {
  var htmlString = ``;
  if (periods.length == 0 || hours.length == 0) {
    return `<div class="orgUserPeriodListElement"></div>`;
  }
  var hoursList = [];
  var periodList = [];
  var hoursList = hours;
  var periodList = periods;
  periodList.sort(periodSorter(type));
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
          class="orgUserPeriodListElement"" 
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
    }
    htmlString += `
          <button class="viewPeriodDetail" onclick="${viewPeriodDetail}">
            <i class="fa-solid fa-calendar-week"></i>
          </button>
        </div>
          `;
  });
  $(element).innerHTML = htmlString;
}
