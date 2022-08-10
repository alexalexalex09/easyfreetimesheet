if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = document.querySelectorAll;
}

window.addEventListener("load", function () {
  DateTime = luxon.DateTime;
  efsFetch("/api/getPeriods", {}, function (res) {
    storePayPeriods(res);
    calendarInit();
    efsFetch("/api/getHours", {}, function (res) {
      localforage.setItem("hours", res).then(function () {
        showHours();
      });
    });
  });
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
  $("#yearModal input").value = year;
  const dt = DateTime.fromObject(
    { year: year, month: month, day: 1 },
    { zone: "utc" }
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
    { zone: "utc" }
  );
  setCalendar(dt);
  closeModals();
}

function setYear() {
  var year = Number.parseInt($("#yearModal input").value);
  var month = Number.parseInt($("calendarInfoItem").getAttribute("data-month"));
  $("calendarInfoItem").setAttribute("data-year", year);
  $("#yearModal input").value = year;
  const dt = DateTime.fromObject(
    { year: year, month: month, day: 1 },
    { zone: "utc" }
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
      zone: "utc",
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
        zone: "utc",
      }
    );
    htmlString += `
      <div class="calendarDay ${day.weekdayShort} day${i}">${i}</div>
    `;
  }
  $("#dates").innerHTML = htmlString;
  $("calendarInfoItem").setAttribute("data-month", dt.month);
  $("calendarInfoItem").setAttribute("data-year", dt.year);
  var owner = "";
  if ($("#legendList select") != null) {
    owner = $("#legendList select").value;
  }
  showPayPeriods(owner);
}

function storePayPeriods(payPeriods) {
  let storage = [];
  payPeriods.forEach(function (v) {
    const periodStart = DateTime.fromISO(v.start, { zone: "utc" });
    const periodEnd = DateTime.fromISO(v.end, { zone: "utc" });
    storage.push({
      periodStart: {
        day: periodStart.day,
        month: periodStart.month,
        year: periodStart.year,
        owner: v.owner,
      },
      periodEnd: {
        day: periodEnd.day,
        month: periodEnd.month,
        year: periodEnd.year,
        owner: v.owner,
      },
    });
  });
  localforage.setItem("payPeriods", storage);
}

function showPayPeriods(owner) {
  localforage.getItem("payPeriods").then(function (payPeriods) {
    if (typeof payPeriods == "undefined") {
      console.log("No pay periods found");
      return;
    }
    if (owner) {
      payPeriods = payPeriods.filter(function (v) {
        return (v.periodStart.owner.name = owner);
      });
    }
    const thisMonth = $("calendarInfoItem").getAttribute("data-month");
    const todayMonth = $("calendarInfoItem").getAttribute("data-today-month");
    const today = $("calendarInfoItem").getAttribute("data-today-day");
    if (thisMonth == todayMonth) {
      showTodayPayPeriods(payPeriods, today, todayMonth, thisMonth);
    }
    showCurrentPayPeriods(payPeriods, thisMonth);
  });
}

function showCurrentPayPeriods(payPeriods, thisMonth) {
  var monthPayPeriods = payPeriods.filter(function (v) {
    return v.periodStart.month == thisMonth || v.periodEnd.month == thisMonth;
  });
  monthPayPeriods.forEach(function (period) {
    $(".day" + period.periodStart.day).classList.add("periodStart");
    $(".day" + period.periodStart.day).classList.add(
      "owner-" + period.periodStart.owner.name
    );
    $(".day" + period.periodEnd.day).classList.add("periodEnd");
    $(".day" + period.periodEnd.day).classList.add(
      "owner-" + period.periodEnd.owner.name
    );
  });
  var orgNames = [];
  monthPayPeriods.forEach(function (v) {
    orgNames.push(v.periodStart.owner.name);
    orgNames.push(v.periodEnd.owner.name);
  });
  var orgNameList = [...new Set(orgNames)];
  if (orgNameList.length > 1) {
    showOrgNameDropDown(orgNameList);
  }
}

function showOrgNameDropDown(orgNameList) {
  $("#periodLegendTitle").innerHTML = "Select Organization:";
  var htmlString = '<select name="periodList" class="selector">';
  orgNameList.forEach(function (orgName, i) {
    htmlString += `<option value="${orgName}">${orgName}</option>`;
  });
  htmlString += "</select>";
  $("#legendList").innerHTML = htmlString;
  setTimeout(function () {
    $("#legendList select").addEventListener("change", function (e) {
      showPayPeriods((owner = $("#legendList select").value));
    });
  }, 1);
}

function showTodayPayPeriods(payPeriods, today, todayMonth, thisMonth) {
  var currentPayPeriods = payPeriods.filter(function (v) {
    const startsEarlierInMonth =
      v.periodStart.month == todayMonth && v.periodStart.day <= today;
    const startsBeforeThisMonth = v.periodStart.month < todayMonth;
    const startsBeforeToday = startsEarlierInMonth || startsBeforeThisMonth;

    const endsLaterInMonth =
      v.periodEnd.month == todayMonth && v.periodEnd.day >= today;
    const endsAfterThisMonth = v.periodEnd.month > todayMonth;
    const endsAfterToday = endsLaterInMonth || endsAfterThisMonth;

    return startsBeforeToday && endsAfterToday;
  });
  currentPayPeriods.forEach(function (period) {
    if (period.periodStart.month == thisMonth) {
      $(".day" + period.periodStart.day).classList.add("currentPeriodStart");
    }
    if (period.periodEnd.month == thisMonth) {
      $(".day" + period.periodEnd.day).classList.add("currentPeriodEnd");
    }
  });
}

function showHours() {
  localforage.getItem("hours").then(function (hours) {
    var currentMonth = $("calendarInfoItem").getAttribute("data-month");
    console.log({ currentMonth });
    hours.forEach(function (v) {
      var d = DateTime.fromISO(v.date, { zone: "utc" });
      console.log(d.month + "/" + d.day);
      if (d.month == currentMonth) {
        $(".day" + d.day).classList.add("hoursPresent");
      }
    });
  });
}

const legendColors = [
  "Red",
  "GoldenRod",
  "Aqua",
  "Aquamarine",
  "Azure",
  "Beige",
  "Bisque",
  "Black",
  "BlanchedAlmond",
  "Blue",
  "BlueViolet",
  "Brown",
  "BurlyWood",
  "CadetBlue",
  "Chartreuse",
  "Chocolate",
  "Coral",
  "CornflowerBlue",
  "Cornsilk",
  "Crimson",
  "Cyan",
  "DarkBlue",
  "DarkCyan",
  "DarkGoldenRod",
  "DarkGray",
  "DarkGrey",
  "DarkGreen",
  "DarkKhaki",
  "DarkMagenta",
  "DarkOliveGreen",
  "DarkOrange",
  "DarkOrchid",
  "DarkRed",
  "DarkSalmon",
  "DarkSeaGreen",
  "DarkSlateBlue",
  "DarkSlateGray",
  "DarkSlateGrey",
  "DarkTurquoise",
  "DarkViolet",
  "DeepPink",
  "DeepSkyBlue",
  "DimGray",
  "DimGrey",
  "DodgerBlue",
  "FireBrick",
  "FloralWhite",
  "ForestGreen",
  "Fuchsia",
  "Gainsboro",
  "GhostWhite",
  "Gold",
  "Gray",
  "Grey",
  "Green",
  "GreenYellow",
  "HoneyDew",
  "HotPink",
  "IndianRed",
  "Indigo",
  "Ivory",
  "Khaki",
  "Lavender",
  "LavenderBlush",
  "LawnGreen",
  "LemonChiffon",
  "LightBlue",
  "LightCoral",
  "LightCyan",
  "LightGoldenRodYellow",
  "LightGray",
  "LightGrey",
  "LightGreen",
  "LightPink",
  "LightSalmon",
  "LightSeaGreen",
  "LightSkyBlue",
  "LightSlateGray",
  "LightSlateGrey",
  "LightSteelBlue",
  "LightYellow",
  "Lime",
  "LimeGreen",
  "Linen",
  "Magenta",
  "Maroon",
  "MediumAquaMarine",
  "MediumBlue",
  "MediumOrchid",
  "MediumPurple",
  "MediumSeaGreen",
  "MediumSlateBlue",
  "MediumSpringGreen",
  "MediumTurquoise",
  "MediumVioletRed",
  "MidnightBlue",
  "MintCream",
  "MistyRose",
  "Moccasin",
  "NavajoWhite",
  "Navy",
  "OldLace",
  "Olive",
  "OliveDrab",
  "Orange",
  "OrangeRed",
  "Orchid",
  "PaleGoldenRod",
  "PaleGreen",
  "PaleTurquoise",
  "PaleVioletRed",
  "PapayaWhip",
  "PeachPuff",
  "Peru",
  "Pink",
  "Plum",
  "PowderBlue",
  "Purple",
  "RebeccaPurple",
  "RosyBrown",
  "RoyalBlue",
  "SaddleBrown",
  "Salmon",
  "SandyBrown",
  "SeaGreen",
  "SeaShell",
  "Sienna",
  "Silver",
  "SkyBlue",
  "SlateBlue",
  "SlateGray",
  "SlateGrey",
  "Snow",
  "SpringGreen",
  "SteelBlue",
  "Tan",
  "Teal",
  "Thistle",
  "Tomato",
  "Turquoise",
  "Violet",
  "Wheat",
  "White",
  "WhiteSmoke",
  "Yellow",
  "YellowGreen",
];
