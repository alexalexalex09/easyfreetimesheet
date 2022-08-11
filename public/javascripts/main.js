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

function efsFetch(req, body, handler, errorHandler) {
  if (body === "") {
    body = {};
  }
  const efs_options = {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch(req, efs_options).then(function (response) {
    return response.json().then((res) => {
      if (res.err) {
        if (errorHandler) {
          errorHandler(res);
        } else {
          if (typeof res.err == "object") {
            createAndShowAlert(res.err.msg + ": " + res.err.param);
          } else {
            createAndShowAlert(res.err);
          }
        }
      } else {
        handler(res);
      }
    });
  });
  return;
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
