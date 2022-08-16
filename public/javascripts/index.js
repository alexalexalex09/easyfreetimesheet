if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = (selector) => document.querySelectorAll(selector);
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

  localforage.getItem("organizations").then(function (orgs) {
    if (!orgs) {
      return;
    }
    if (orgs.length > 1) {
      orgs.forEach(function (org) {
        var el = document.createElement("option");
        el.value = org.code;
        el.innerHTML = org.name;
        $("#organizationSelect").appendChild(el);
      });
      $("#organizationSelectContainer").classList.remove("hidden");
    }
    if (orgs.length == 0) {
      $("#indexContainer").innerHTML = `
          <div id="noOrgsTitle" class="pageTitle">Welcome!</div>
          <div id="noOrgsPrompt">Please join an organization to get started.</div>
          <div id="noOrgsDesc">Click on the menu icon and select organizations to enter a code</div>
        `;
    }
  });
});

function showTimePicker() {
  $("#hoursInput").setAttribute("disabled", "");
}

function changeInput(element, amount) {
  if (
    parseInt($(element).value) + amount >= 0 &&
    parseInt($(element).value) + amount <= $(element).lastChild.value
  ) {
    $(element).value = parseInt($(element).value) + amount;
  }

  console.log(element);
  console.log($(element).value);
  console.log(amount);
}

function submitHours() {
  const theDate = $("#dateInput").value;
  const theHours = $("#hoursInput").value;
  const theMinutes = $("#minutesInput").value;
  const theType = $("#hoursType").value;
  const theOrg = $("#organizationSelect").value;
  const body = {
    date: theDate,
    hours: theHours,
    minutes: theMinutes,
    type: theType,
    organization: theOrg,
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
