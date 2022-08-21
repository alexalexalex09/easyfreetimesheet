if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = (selector) => document.querySelectorAll(selector);
}

const startDate = window.location.pathname
  .slice(window.location.pathname.lastIndexOf("/") + 1)
  .toUpperCase();

var temp = window.location.pathname.substring(
  window.location.pathname.indexOf("myOrgs") + 7
);
const orgCode = temp.substring(0, temp.indexOf("/"));

window.addEventListener("load", function () {
  DateTime = luxon.DateTime;
  eftFetch("/api/getPayPeriodByOrg", {
    code: orgCode,
    startDate: startDate,
  }).then(function (ret) {
    const { org, users, period } = ret;
    $("#orgTitle").innerHTML = org.name;
    if (period.fullyApproved) {
      $("#payPeriodApprove").innerHTML = `      
      <button id="payperiodApproveCancel" onclick="backToOrg()"> Back </button>
      <button id="payperiodApproveCancel" onclick="revokePeriod()"> Revoke Approval </button>
      `;
    } else {
      $("#payPeriodApprove").innerHTML = `
      <button id="payperiodApproveCancel" onclick="backToOrg()"> Cancel </button>
      <button id="payPeriodApproveButton" onclick="approvePeriod()"> Approve </button>
      `;
    }
    const periodTitle =
      DateTime.fromISO(period.start, { zone: "utc" }).toLocaleString() +
      " - " +
      DateTime.fromISO(period.end, { zone: "utc" }).toLocaleString();
    $("#payPeriodTitle").innerHTML = periodTitle;
    loadUsers(users);
  });
});

function loadUsers(users) {
  var htmlString = ``;
  var totalHours = 0;
  var totalMinutes = 0;
  console.log({ users });
  for (const userKey in users) {
    const user = users[userKey];
    console.log({ user });
    var hoursString = ``;
    user.hours.sort(function (a, b) {
      return (
        DateTime.fromISO(a.date, { zone: "utc" }) -
        DateTime.fromISO(b.date, { zone: "utc" })
      );
    });
    for (const hourKey in user.hours) {
      const hour = user.hours[hourKey];
      const hourMinutes = hour.minutes == 0 ? "00" : hour.minutes;
      const hourDate = DateTime.fromISO(hour.date, { zone: "utc" });
      hoursString += `
          <div class="payPeriodUserHour">
            <div class="payPeriodUserHourDate">${hourDate.toLocaleString()}</div>
            <div class="payPeriodUserHourAmount">
              ${hour.hours}:${hourMinutes}
            </div>
          </div>
      `;
      totalHours += hour.hours;
      totalMinutes += hour.minutes;
    }
    totalHours += Math.floor(totalMinutes / 60);
    totalMinutes = totalMinutes % 60 == 0 ? "00" : totalMinutes % 60;
    htmlString += `
      <div class="payPeriodUser">
        <div class="payPeriodUserName">${user.displayName}</div>
        <div class="payPeriodUserApproved">${
          user.approved ? "" : "Not "
        }Approved</div>
        <div class="payPeriodUserHoursTotal">Total: ${totalHours}:${totalMinutes}</div>
        <div class="payPeriodUserHoursList">${hoursString}</div>
      </div>`;
  }
  $("#payPeriodUsersList").innerHTML = htmlString;
}

function backToOrg() {
  window.location.href = window.location.href.slice(0, -21);
}

function approvePeriod() {
  $("#calendarShadow").classList.remove("hidden");
  var body = {
    start: startDate,
    org: orgCode,
  };
  eftFetch("/api/adminApprovePeriod", body).then(function (res) {
    if (res.err) {
      createAndShowAlert(res.err);
      $("#calendarShadow").classList.add("hidden");
    } else {
      showSuccessCheck().then(function () {
        window.location.href = window.location.href.slice(0, -21);
      });
      console.log({ res });
    }
  });
}

function revokePeriod() {
  $("#calendarShadow").classList.remove("hidden");
  var body = {
    start: startDate,
    org: orgCode,
  };
  eftFetch("/api/adminRevokePeriod", body).then(function (res) {
    if (res.err) {
      createAndShowAlert(res.err);
      $("#calendarShadow").classList.add("hidden");
    } else {
      showSuccessCheck().then(function () {
        window.location.href = window.location.href.slice(0, -21);
      });
      console.log({ res });
    }
  });
}
