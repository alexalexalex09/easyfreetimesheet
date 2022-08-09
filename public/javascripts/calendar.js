if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = document.querySelectorAll;
}

window.addEventListener("load", function () {
  //efsFetch("/api/getCalendar", {}, function (res) {});
  DateTime = luxon.DateTime;
  calendarInit();
});

function calendarInit() {
  const dt = DateTime.now();
  $("calendarInfoItem").setAttribute("data-today-day", dt.day);
  $("calendarInfoItem").setAttribute("data-today-month", dt.month);
  $("calendarInfoItem").setAttribute("data-today-year", dt.year);
  $("#yearModal input").setAttribute("value", dt.year);
  setCalendar(dt);
}

function changeMonth(amount) {
  var month = Number.parseInt($("calendarInfoItem").getAttribute("data-month"));
  var year = Number.parseInt($("calendarInfoItem").getAttribute("data-year"));
  month = month + amount;
  $("calendarInfoItem").setAttribute("data-month", month);
  if (month == 13) {
    month = 1;
    year++;
  }
  if (month == 0) {
    month = 12;
    year--;
  }
  const dt = DateTime.fromObject(
    { year: year, month: month, day: 1 },
    { zone: "America/New_York" }
  );
  setCalendar(dt);
}
function showSelectMonth() {
  $("#monthModal").classList.remove("hidden");
  $("#calendarShadow").classList.remove("hidden");
}

function showSelectYear() {
  $("#yearModal").classList.remove("hidden");
  $("#calendarShadow").classList.remove("hidden");
}

function setMonth(month) {
  var year = Number.parseInt($("calendarInfoItem").getAttribute("data-year"));
  $("calendarInfoItem").setAttribute("data-month", month);
  const dt = DateTime.fromObject(
    { year: year, month: month, day: 1 },
    { zone: "America/New_York" }
  );
  setCalendar(dt);
  closeModals();
}

function setYear() {
  var year = Number.parseInt($("#yearModal input").value);
  var month = Number.parseInt($("calendarInfoItem").getAttribute("data-month"));
  $("calendarInfoItem").setAttribute("data-year", year);
  const dt = DateTime.fromObject(
    { year: year, month: month, day: 1 },
    { zone: "America/New_York" }
  );
  setCalendar(dt);
  closeModals();
}

function closeModals() {
  $("#monthModal").classList.add("hidden");
  $("#yearModal").classList.add("hidden");
  $("#calendarShadow").classList.add("hidden");
}

function setCalendar(luxonDateTime) {
  const dt = luxonDateTime;
  var htmlString = ``;
  var day = DateTime.fromObject(
    {
      year: dt.year,
      month: dt.month,
      day: 1,
    },
    {
      zone: "America/New_York",
    }
  );
  $("#year").innerHTML = dt.year;
  $("#month").innerHTML = dt.monthLong;
  var htmlString = "";
  if (day.weekday == 7) {
    htmlString = `<div class="calendarDay calendarStartSpace" style="display:none"></div>`;
  } else {
    htmlString = `<div class="calendarDay calendarStartSpace" style="grid-area:1/1/1/${
      day.weekday + 1
    }"></div>`;
  }
  for (var i = 1; i <= dt.endOf("month").day; i++) {
    const day = DateTime.fromObject(
      {
        year: dt.year,
        month: dt.month,
        day: i,
      },
      {
        zone: "America/New_York",
      }
    );
    htmlString += `
      <div class="calendarDay ${day.weekdayShort}">${i}</div>
    `;
  }
  $("#dates").innerHTML = htmlString;
  $("calendarInfoItem").setAttribute("data-month", dt.month);
  $("calendarInfoItem").setAttribute("data-year", dt.year);
}
