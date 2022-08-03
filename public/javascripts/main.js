const $ = (selector) => document.querySelector(selector);
const $$ = document.querySelectorAll;

function showTimePicker() {
  $("#hoursInput").setAttribute("disabled", "");
}
