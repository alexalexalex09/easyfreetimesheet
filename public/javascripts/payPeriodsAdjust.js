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
    fillAdjustPeriods(upcoming, "#adjustPeriodsListContainer");
  });
});

function fillAdjustPeriods(periods, el) {
  var htmlString = "";
  var i = 0;
  periods.forEach(function (period) {
    const start = DateTime.fromISO(period.start, {
      zone: "utc",
    });
    const startDate = start.toLocaleString().slice(0, -5);
    const end = DateTime.fromISO(period.end, { zone: "utc" });
    const endDate =
      end.toLocaleString().slice(0, -4) + end.toLocaleString().slice(-2);
    const wellFormedEndDate = end.toISO().slice(0, 10);
    htmlString += `<div class="orgPeriodDate" id="orgPeriodDate${i}">
                      <div class="adjustStartDate">${startDate}</div> - <button class="adjustEndDate" onclick="adjustEndDate(this)">${endDate}</button>
                      <div class="adjustDatePicker hidden"><input type="date" value="${wellFormedEndDate}" onchange="adjustSubsequentDates(${i})"></div>
                  </div>`;
    i++;
  });
  $(el).innerHTML = htmlString;
}

function adjustEndDate(el) {
  const datePicker = el.parentNode.querySelector(".adjustDatePicker");
  datePicker.classList.toggle("hidden");
}

function adjustSubsequentDates(i) {
  const newDate = DateTime.fromISO(
    $(`#orgPeriodDate${i} .adjustDatePicker input`).value,
    { zone: "utc", keepLocalTime: true }
  );
  const nextEnd = DateTime.fromISO(
    $(`#orgPeriodDate${i + 1} .adjustDatePicker input`).value,
    { zone: "utc", keepLocalTime: true }
  ).minus({ days: 1 });
  if ($("#preserveDates").checked && newDate > nextEnd) {
    $(`#orgPeriodDate${i} .adjustDatePicker`).classList.toggle("hidden");
    return {
      error: "Cannot set new start date beyond the next pay period's end date",
    };
  }
  if ($("#preserveDates").checked) {
    $(`#orgPeriodDate${i + 1} .adjustStartDate`).innerHTML = newDate
      .plus({ days: 1 })
      .toLocaleString()
      .slice(0, -5);
    $(`#orgPeriodDate${i} .adjustEndDate`).innerHTML =
      newDate.toLocaleString().slice(0, -4) +
      newDate.toLocaleString().slice(-2);
    $(`#orgPeriodDate${i} .adjustDatePicker`).classList.toggle("hidden");
  }
}

function showModal(modal) {
  $("#calendarShadow").classList.remove("hidden");
  $("#" + modal).classList.remove("hidden");
}
