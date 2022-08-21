if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = (selector) => document.querySelectorAll(selector);
}

const orgCode = window.location.pathname
  .slice(window.location.pathname.lastIndexOf("/") + 1)
  .toUpperCase();

window.addEventListener("load", function () {
  DateTime = luxon.DateTime;
});
