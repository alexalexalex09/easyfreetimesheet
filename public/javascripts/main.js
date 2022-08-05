const $ = (selector) => document.querySelector(selector);
const $$ = document.querySelectorAll;

//TODO: Add ability to join organization

window.addEventListener("load", function () {
  Date.prototype.toDateInputValue = function () {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0, 10);
  };

  $("#dateInput").value = new Date().toDateInputValue();
});

function efsFetch(req, body, handler, errorHandler) {
  if (body === "") {
    body = {};
  }
  const tts_options = {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch(req, tts_options).then(function (response) {
    return response.json().then((res) => {
      if (res.err) {
        if (errorHandler) {
          errorHandler(res);
        } else {
          createAndShowAlert(res.err);
        }
      } else {
        handler(res);
      }
    });
  });
  return;
}

function showTimePicker() {
  $("#hoursInput").setAttribute("disabled", "");
}

function changeInput(element, amount) {
  console.log(element);
  console.log($(element).value);
  console.log(amount);
  $(element).value = parseInt($(element).value) + amount;
  if ($(element).getAttribute("min")) {
    if ($(element).value < $(element).getAttribute("min")) {
      $(element).value = $(element).getAttribute("min");
    }
  }
}

function submitHours() {
  const theDate = $("#dateInput").value;
  const theHours = $("#hoursInput").value;
  const theMinutes = $("#hoursInput").value;
  const theType = $("#hoursType").value;
  const body = {
    date: theDate,
    hours: theHours,
    minutes: theMinutes,
    type: theType,
  };
  efsFetch("/api/submit", body, function (res) {
    console.log({ res });
  });
}
