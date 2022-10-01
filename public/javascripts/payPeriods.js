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
});

function showModal(modal) {
  $("#calendarShadow").classList.remove("hidden");
  $("#" + modal).classList.remove("hidden");
}
