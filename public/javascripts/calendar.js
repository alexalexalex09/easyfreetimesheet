if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = (selector) => document.querySelectorAll(selector);
}

window.addEventListener("load", function () {
  DateTime = luxon.DateTime;
  efsFetch("/api/getPeriods", {}, function (res) {
    storePayPeriods(res).then(function (res) {
      calendarInit();
      const thisMonth = $("calendarInfoItem").getAttribute("data-month");
      console.log({ res });
      showOrgList(res, thisMonth);
      efsFetch("/api/getHours", {}, function (res) {
        localforage.setItem("hours", res).then(function () {
          showHours();
        });
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
  $("#hoursModal").classList.add("hidden");
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
  $("#dateBarYear").innerHTML = dt.year;
  $("#dateBarMonth").innerHTML = dt.monthLong;
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
  showHours();
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
    updatePayPeriods(payPeriods, thisMonth);
    showHours();
  });
}

function showOrgList(payPeriods, thisMonth) {
  var monthPayPeriods = payPeriods.filter(function (v) {
    return v.periodStart.month == thisMonth || v.periodEnd.month == thisMonth;
  });
  var orgCodes = [];
  monthPayPeriods.forEach(function (v) {
    orgCodes.push(v.periodStart.owner.code);
    orgCodes.push(v.periodEnd.owner.code);
  });
  var orgCodeList = [...new Set(orgCodes)];
  var orgNameList = [];
  orgCodeList.forEach(function (orgCode) {
    const orgName = payPeriods.find(function (payPeriod) {
      return payPeriod.periodStart.owner.code == orgCode;
    });
    orgNameList.push({ code: orgCode, name: orgName.periodStart.owner.name });
  });
  console.log({ orgNameList });
  if (orgNameList.length > 1) {
    showOrgNameDropDown(orgNameList);
  }
}

function updatePayPeriods(payPeriods, thisMonth) {
  var monthPayPeriods = payPeriods.filter(function (v) {
    return v.periodStart.month == thisMonth || v.periodEnd.month == thisMonth;
  });
  monthPayPeriods.forEach(function (period) {
    $(".day" + period.periodStart.day).classList.add("periodStart");
    $(".day" + period.periodStart.day).classList.add(
      "owner-" + period.periodStart.owner.code
    );
    $(".day" + period.periodEnd.day).classList.add("periodEnd");
    $(".day" + period.periodEnd.day).classList.add(
      "owner-" + period.periodEnd.owner.code
    );
  });
}

function showOrgNameDropDown(orgNameList) {
  $("#periodLegendTitle").innerHTML = "Select Organization:";
  var htmlString =
    '<select name="periodList" id="periodList" class="selector">';
  orgNameList.forEach(function (orgCode, i) {
    htmlString += `<option value="${orgCode.code}">${orgCode.name}</option>`;
  });
  htmlString += "</select>";
  $("#legendList").innerHTML = htmlString;
  setTimeout(function () {
    $("#periodList").addEventListener("change", function (e) {
      showPayPeriods($("#periodList").value);
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
  $$(".hoursNotificationContainer").forEach(function (el) {
    el.remove();
  });
  localforage.getItem("hours").then(function (hoursRecords) {
    hoursRecords = hoursRecords.filter(function (v) {
      return v.organization.code == $("#periodList").value;
    });
    var currentMonth = $("calendarInfoItem").getAttribute("data-month");
    var currentYear = $("calendarInfoItem").getAttribute("data-year");
    var lastDay = DateTime.fromObject(
      {
        day: 1,
        month: currentMonth,
        year: currentYear,
      },
      { zone: "utc" }
    ).endOf("month").day;
    for (var day = 1; day <= lastDay; day++) {
      const date = DateTime.fromObject(
        {
          day: day,
          month: currentMonth,
          year: currentYear,
        },
        { zone: "utc" }
      );
      const hours = getDayHours(hoursRecords, date);
      if (hours != "") {
        $(".day" + day).innerHTML += `
          <div class="hoursNotificationContainer">
            <div class="hoursNotificationText clickable" onclick="showHoursDetail('${date.toISO()}')">${hours}</div>
          </div>`;
      }
    }
  });
}

function getDayHours(hoursRecords, d) {
  var hours = 0;
  var minutes = 0;
  hoursRecords = hoursRecords.filter(function (v) {
    vDate = DateTime.fromISO(v.date, { zone: "utc", keepLocalTime: true });
    return vDate.month == d.month && vDate.day == d.day;
  });

  hoursRecords.forEach(function (v) {
    hours += Number.parseInt(v.hours);
    minutes += Number.parseInt(v.minutes);
  });
  hours += Math.floor(minutes / 60);
  minutes = minutes % 60;
  switch (minutes) {
    case 0:
      hours = hours;
      break;
    case 15:
      hours = hours + "&frac14;";
      break;
    case 30:
      hours = hours + "&frac12;";
      break;
    case 45:
      hours = hours + "&frac34;";
      break;
  }
  return hours;
}

function showHoursDetail(isoDate) {
  localforage.getItem("hours").then(function (hours) {
    var hoursIndices = [];
    var hoursRecord = hours.filter(function (v, i) {
      if (v.date == isoDate) {
        hoursIndices.push(i);
      }
      return v.date == isoDate;
    });
    const date = DateTime.fromISO(isoDate, { zone: "utc" });
    $(
      "#hoursDetailDate"
    ).innerHTML = `<div class="hoursDetailDate">${date.toLocaleString()}</div>`;
    var htmlString = ``;
    hoursRecord.forEach(function (record, index) {
      var hours = record.hours + ":";
      hours += record.minutes == "0" ? "00" : record.minutes;
      hours += " " + record.type;
      htmlString += `
      <div class="hoursDetailRecord clickable" onclick="editRecord('${record._id}')">
        <div class="hoursDetailHours">${hours}</div>
        <div class="hoursDetailEdit"><i class="fa-solid fa-pen-to-square"></i></div>
      </div>`;
    });
    $("#hoursModalRecords").innerHTML = htmlString;
    $("#calendarShadow").classList.remove("hidden");
    $("#hoursModal").classList.remove("hidden");
  });
}

function editRecord(_id) {
  localforage.getItem("hours").then(function (hours) {
    localforage.getItem("organizations").then(function (organizations) {
      const record = hours.find(function (v) {
        return v._id == _id;
      });
      var orgSelector = "";
      if (organizations.length > 1) {
        orgSelector = `<label class="selectLabel" for="editOrg">Organization:</label>
                       <select class="selector" id="editOrg">`;
        organizations.forEach(function (org) {
          orgSelector += `<option value="${org.code}">${org.name}</option>`;
        });
        orgSelector += `</select>`;
      }
      var date = DateTime.fromISO(record.date, { zone: "utc" }).toFormat(
        "yyyy-MM-dd"
      );
      var hoursOptions = ``;
      for (var i = 0; i <= 24; i++) {
        hoursOptions += `<option value=${i}>${i}</option>`;
      }
      var minuteOptions = ``;
      for (var i = 0; i <= 45; i = i + 15) {
        minuteOptions += `<option value=${i}>${i}</option>`;
      }
      var htmlString = `
        <div id="editRecord">
          <input type="date" id="editDate" min="0" value="${date}">
          <select name="editHours" id="editHours">${hoursOptions}</select>
          <select name="editMinutes" id="editMinutes">${minuteOptions}</select>
          <label class="numberLabel" for="editHours">Hours</label>
          <label class="numberLabel" for="editMinutes">Minutes</label>
          <label class="selectLabel" for="editHoursType">Type of Hours:</label>
          <select class="selector" id="editHoursType">
            <option value="worked">Worked</option>
            <option value="vacation">Vacation</option>
          </select>
          ${orgSelector}
          <button id="editDelete" onclick="deleteRecord('${record._id}')">Delete?</button>
          <button id="editCancel" onclick="deleteRecord(closeModals())">Cancel</button>
          <button id="editSubmit" onclick="submitRecordEdit('${record._id}')">Submit</button>
        </div>
        `;
      $("#hoursModalRecords").innerHTML = htmlString;
      setTimeout(function () {
        $("#editHoursType").value = record.type;
        if ($("#editOrg") !== null) {
          $("#editOrg").value = record.organization.code;
          $("#editHours").value = record.hours;
          $("#editMinutes").value = record.minutes;
        }
      });
    });
  });
}

function deleteRecord(_id) {
  $("#editDelete").innerHTML = "Click to confirm deletion";
  $("#editDelete").setAttribute("onclick", `confirmDelete('${_id}')`);
}

function confirmDelete(_id) {
  efsFetch("/api/deleteRecord", { _id: _id }, function (res) {
    if (res.hours) {
      localforage.setItem("hours", res.hours).then(function () {
        showHours();
        closeModals();
      });
    }
  });
}

function submitRecordEdit(_id) {
  var org = "";
  if ($("#editOrg") !== null) {
    org = $("#editOrg").value;
  }
  const body = {
    _id: _id,
    hours: $("#editHours").value,
    minutes: $("#editMinutes").value,
    type: $("#editHoursType").value,
    organization: org,
    date: $("#editDate").value,
  };
  efsFetch("/api/editRecord", body, function (res) {
    if (res.hours) {
      localforage.setItem("hours", res.hours).then(function () {
        showHours();
        closeModals();
      });
    }
  });
}
