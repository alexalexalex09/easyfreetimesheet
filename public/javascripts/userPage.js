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
    var htmlString = ``;
    console.log(ret.unapprovedPeriods);
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
    const types = ["worked", "vacation"];
    var totals = {};
    types.forEach(function (type) {
      var hoursTotal = 0;
      var minutesTotal = 0;
      var totalHoursList = [];
      const currentYear = DateTime.now().year;
      ret.hours.forEach(function (hours) {
        const year = DateTime.fromISO(hours.date, {
          zone: "utc",
        }).year;
        if (year == currentYear && hours.type == type) {
          totalHoursList.push(hours);
        }
      });
      totalHoursList.forEach(function (v) {
        hoursTotal += Number.parseInt(v.hours);
        minutesTotal += Number.parseInt(v.minutes);
      });
      hoursTotal += Math.floor(minutesTotal / 60);
      minutesTotal = minutesTotal % 60;
      totals[type] = hoursTotal + minutesTotal / 60;
    });

    htmlString = `
    <div id="yearlyHours">Annual: ${totals.worked}/${user.hourLimits.maxYearly}</div>
    <div id="vacationHours">Vacation: ${totals.vacation}/${user.hourLimits.vacation}</div>
    <div id="regularHours">${user.hourLimits.regularHours} hours per week</div>
    `;
    $("#hoursUsed").innerHTML = htmlString;
    var el = document.createElement("div");
    el.classList.add("calendarModal");
    el.classList.add("hidden");
    el.id = "editHoursModal";
    el.innerHTML = `
      <label for="editYearly">Annual</label>
      <input type="number" x-data-original="${user.hourLimits.maxYearly}" value="${user.hourLimits.maxYearly}" name="editYearly" id="editYearly"></input>
      <label for="editVacation">Vacation</label>
      <input type="number" x-data-original="${user.hourLimits.vacation}" value="${user.hourLimits.vacation}" name="editVacation" id="editVacation"></input>
      <label for="editRegular">Weekly</label>
      <input type="number" x-data-original="${user.hourLimits.regularHours}" value="${user.hourLimits.regularHours}" name="editRegular" id="editRegular"></input>
      <button onclick="resetEditHours()">Cancel</button>
      <button onclick="submitHoursChanges()">Submit</button>
    `;
    $("body").appendChild(el);
  });
});

function displayPayPeriod(periods, hours, type, element) {
  console.log(periods.length == 0);
  var htmlString = ``;
  if (periods.length == 0) {
    $(element).innerHTML = `<div class="orgUserPeriodListElement"></div>`;
    return;
  }
  var hoursList = [];
  var periodList = [];
  var hoursList = hours;
  var periodList = periods;
  periodList.sort(periodSorter(type));
  periodList.forEach(function (period, i) {
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
    var hoursTotal = 0;
    var minutesTotal = 0;
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
          class="orgUserPeriodListElement" 
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

function editHours() {
  $("#calendarShadow").classList.remove("hidden");
  $("#editHoursModal").classList.remove("hidden");
}

function resetEditHours() {
  $("#editYearly").value = $("#editYearly").getAttribute("x-data-original");
  $("#editVacation").value = $("#editVacation").getAttribute("x-data-original");
  $("#editRegular").value = $("#editRegular").getAttribute("x-data-original");
  closeModals();
}

function submitHoursChanges() {
  eftFetch("/api/editUserHours", {
    user: window.location.href.substring(
      window.location.href.lastIndexOf("/") + 1
    ),
    maxYearly: $("#editYearly").value,
    vacation: $("#editVacation").value,
    regularHours: $("#editRegular").value,
  }).then(function (ret) {
    window.location.reload();
    /*
    $("#editYearly").value = ret.maxYearly;
    $("#editYearly").setAttribute("x-data-original", ret.maxYearly);
    $("#editVacation").value = ret.vacation;
    $("#editVacation").setAttribute("x-data-original", ret.vacation);
    $("#editRegular").value = ret.regularHours;
    $("#editRegular").setAttribute("x-data-original", ret.regularHours);
    closeModals();*/
  });
}
