if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = (selector) => document.querySelectorAll(selector);
}

//TODO: Add ability to join organization

window.addEventListener("load", function () {
  Date.prototype.toDateInputValue = function () {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0, 10);
  };
});

async function eftFetch(req, body, handler, errorHandler) {
  var promise = new Promise(function (resolve, reject) {
    if (body === "") {
      body = {};
    }
    const eft_options = {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    };
    fetch(req, eft_options).then(function (response) {
      return response.json().then((res) => {
        if (res.err) {
          if (errorHandler) {
            errorHandler(res);
            reject(res);
          } else {
            if (typeof res.err == "object") {
              createAndShowAlert(res.err.msg + ": " + res.err.param);
              reject(res.err.msg + ": " + res.err.param);
            } else {
              createAndShowAlert(res.err);
              reject(res.err);
            }
          }
        } else {
          if (handler) {
            handler(res);
          }
          resolve(res);
        }
      });
    });
  });
  return promise;
}

function createAndShowAlert(err) {
  var el = document.createElement("div");
  el.setAttribute("id", "error");
  el.innerHTML = err;
  el.style.opacity = 0;
  $("body").appendChild(el);
  setTimeout(function () {
    el.style.opacity = 1;
    setTimeout(function () {
      el.style.opacity = "0";
      setTimeout(function () {
        el.remove();
      }, 500);
    }, 3000);
  }, 1);
}

function showTimePicker() {
  $("#hoursInput").setAttribute("disabled", "");
}

function changeInput(element, amount) {
  $(element).value = parseInt($(element).value) + amount;
  if ($(element).getAttribute("min")) {
    if ($(element).value < $(element).getAttribute("min")) {
      $(element).value = $(element).getAttribute("min");
    }
  }
}

function storePayPeriods(payPeriods) {
  var promise = new Promise(function (resolve, reject) {
    let storage = [];
    payPeriods.forEach(function (v) {
      const periodStart = DateTime.fromISO(v.start, { zone: "utc" });
      const periodEnd = DateTime.fromISO(v.end, { zone: "utc" });
      const periodDue = DateTime.fromISO(v.dueDate, { zone: "utc" });
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
        periodDue: {
          day: periodDue.day,
          month: periodDue.month,
          year: periodDue.year,
          owner: v.owner,
        },
      });
    });
    localforage.setItem("payPeriods", storage).then(function (res) {
      resolve(storage);
    });
  });
  return promise;
}

function showSuccessCheck() {
  var promise = new Promise(function (resolve, reject) {
    var htmlString = `
      <div class="success-checkmark">
        <div class="check-icon">
          <span class="icon-line line-tip"></span>
          <span class="icon-line line-long"></span>
          <div class="icon-circle"></div>
          <div class="icon-fix"></div>
        </div>
      </div>
    `;
    var el = document.createElement("div");
    el.classList.add("successAlert");
    el.innerHTML = htmlString;
    $("body").append(el);
    setTimeout(function () {
      el.style.opacity = 0;
      setTimeout(function () {
        el.remove();
        resolve();
      }, 100);
    }, 2000);
  });
  return promise;
}

function closeModals() {
  $$(".calendarModal").forEach(function (el) {
    el.classList.add("hidden");
  });
  $("#calendarShadow").classList.add("hidden");
}

function viewPeriodDetail(_id) {
  console.log("#period" + _id + " .displayHoursDetail");
  $("#period" + _id + " .displayHoursDetail").classList.remove("hidden");
  $("#calendarShadow").classList.remove("hidden");
  console.log("Nothing yet");
}

function periodSorter(type) {
  return function (a, b) {
    switch (type) {
      case "unapproved":
        return (
          DateTime.fromISO(a.start, { zone: "utc" }) -
          DateTime.fromISO(b.start, { zone: "utc" })
        );
        break;
      case "revokable":
      case "approved":
      default:
        return (
          DateTime.fromISO(b.start, { zone: "utc" }) -
          DateTime.fromISO(a.start, { zone: "utc" })
        );
        break;
    }
  };
}
