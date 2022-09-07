if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = (selector) => document.querySelectorAll(selector);
}

const userCode = window.location.pathname
  .slice(window.location.pathname.lastIndexOf("/") + 1)
  .toUpperCase();
const orgCode = window.location.pathname.slice(
  window.location.pathname.indexOf("myOrgs") + 7,
  window.location.pathname.indexOf("myOrgs") + 12
);

window.addEventListener("load", function () {
  DateTime = luxon.DateTime;
  eftFetch("/api/getOrgUser", {
    userCode: userCode,
    orgCode: orgCode,
  }).then(function (ret) {});
});
