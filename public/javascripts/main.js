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

  $("#addOrgInputs input").addEventListener("keyup", function () {
    $("#addOrgInputs input").value = $(
      "#addOrgInputs input"
    ).value.toUpperCase();
  });
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

function toggleMenu() {
  $("#mainMenu").classList.toggle("small");
  setTimeout(function () {
    for (const element of $("#mainMenu").children) {
      element.classList.toggle("hidden");
    }
  }, 50);
}

function showOrgMenu() {
  $("#orgMenu").style.left = "100%";
  $("#orgMenu").classList.remove("hidden");
  setTimeout(function () {
    $("#orgMenu").style.left = "0%";
    $("#mainMenu").style.left = "-100%";
    setTimeout(function () {
      for (const element of $("#mainMenu").children) {
        element.classList.add("hidden");
      }
      $("#mainMenu").classList.add("small");
      $("#mainMenu").style.removeProperty("left");
    }, 1000);
  }, 0);
  efsFetch(
    "/api/getOrgs",
    {},
    function (res) {
      if ($("#fetchingOrgs") != null) {
        $("#fetchingOrgs").remove();
      }
      var htmlString = ``;
      for (const org of res) {
        htmlString += `<div class="org"><div class="orgName">${org.name}</div><div class="orgCode">${org.code}</div></div>`;
      }
      $("#orgs").innerHTML = htmlString;
    },
    function (err) {
      $("#fetchingOrgs").classList.add("hidden");
      switch (err.err) {
        case "none":
          $("#orgs").innerHTML = `
          <div class="error">No organizations found</div>`;
          break;
        default:
          $("#orgs").innerHTML = `
          <div class="error">Error: ${err.err}</div>`;
          break;
      }
    }
  );
}

function closeOrgMenu() {
  console.log("closing org");
  $("#orgMenu").classList.add("small");
  setTimeout(function () {
    for (const element of $("#orgMenu").children) {
      element.classList.add("hidden");
    }
  }, 50);
  setTimeout(function () {
    $("#orgMenu").classList.remove("small");
    $("#orgMenu").classList.add("hidden");
    for (const element of $("#orgMenu").children) {
      element.classList.remove("hidden");
    }
  }, 1000);
}

function showCreateOrg() {
  $("#createOrg").style.transform = "translate(-50%, -100%)";
  setTimeout(function () {
    $("#createOrg").style.zIndex = "4";
    $("#createOrg").style.transform = "translate(-50%, 0)";
  }, 200);
}

function createOrg() {
  if ("#createOrg input".value != "") {
    const body = {
      name: $("#createOrg input").value,
    };
    efsFetch("/api/createOrg", body, function (res) {
      console.log("Success!");
      $("#createOrg input").value = "Success!";
      setTimeout(function () {
        $("#createOrg").classList.add("hidden");
        $("#showCreateOrg").classList.remove("hidden");
      }, 2000);
    });
  }
}

function joinOrg() {
  const body = { code: $("#addOrgInputs input").value };
  efsFetch("/api/joinOrg", body, function (res) {
    $("#addOrgInputs input").value = "";
    efsFetch("/api/getOrgs", {}, function (res) {});
  });
}
