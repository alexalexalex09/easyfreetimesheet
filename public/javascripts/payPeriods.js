if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = (selector) => document.querySelectorAll(selector);
}

const orgCode = window.location.pathname.slice(
  window.location.pathname.indexOf("myOrgs") + 7,
  window.location.pathname.indexOf("myOrgs") + 12
);

function goToOrg() {
  window.location = "/myOrgs/" + orgCode;
}

window.addEventListener("load", function () {
  DateTime = luxon.DateTime;
  eftFetch("/api/getOrg", { code: orgCode }).then(function (ret) {
    const { org, upcoming } = ret;
    $("#payPeriodsOrg").innerHTML = org.name;
    fillPeriods(upcoming, "#payPeriodsListContainer");
  });
});

function showModal(modal) {
  $("#calendarShadow").classList.remove("hidden");
  $("#" + modal).classList.remove("hidden");
}

function submitPeriodsToAdd() {
  var periods = $("#periodsToAdd").value;
  eftFetch("/api/addPeriods", { periods: periods }).then(function (ret) {
    console.log({ ret });
    closeModals();
  });
}

function fillPeriods(periods, el) {
  var htmlString = "";
  periods.forEach(function (period) {
    const start = DateTime.fromISO(period.start, {
      zone: "utc",
    });
    const startDate = start.toLocaleString();
    const end = DateTime.fromISO(period.end, { zone: "utc" });
    const endDate = end.toLocaleString();
    const date =
      startDate.slice(0, -5) + " - " + endDate.slice(0, -4) + endDate.slice(-2);
    htmlString += `<div class="orgPeriodDate"><a href="/myOrgs/${orgCode}/payPeriod/${start
      .toString()
      .slice(0, 10)}">${date}</a></div>`;
  });
  $(el).innerHTML = htmlString;
}

function submitSchedule() {}

function submitDueDate() {}
