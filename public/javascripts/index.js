if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = document.querySelectorAll;
}

window.addEventListener("load", function () {
  Date.prototype.toDateInputValue = function () {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0, 10);
  };

  $("#dateInput").value = new Date().toDateInputValue();

  $("#addOrgInputs input").addEventListener("keyup", function () {
    $("#addOrgInputs input").value = $(
      "#addOrgInputs input"
    ).value.toUpperCase();
  });
});

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
  const theMinutes = $("#minutesInput").value;
  const theType = $("#hoursType").value;
  const body = {
    date: theDate,
    hours: theHours,
    minutes: theMinutes,
    type: theType,
  };
  efsFetch("/api/submit", body, function (res) {
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
      }, 1000);
    }, 2000);
    console.log({ res });
  });
}
