if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = document.querySelectorAll;
}

window.addEventListener("load", function () {
  efsFetch("/api/getHours", {}, function (res) {
    var htmlString = "";
    res.forEach(function (hours) {
      if (hours.minutes == "0") {
        hours.minutes = "00";
      }
      var hoursDate = new Date(hours.date).toLocaleDateString("en-US");
      htmlString += `
      <div class="hoursDisplay">
        <div class="timeDisplay">${hours.hours}:${hours.minutes}</div>
        <div class="dateDisplay">${hoursDate}</div>
        <div class="typeDisplay">${
          hours.type[0].toUpperCase() + hours.type.substring(1)
        }</div>
        <div class="editHours clickable" onclick="editHours(${hours._id})">
          <i class="fa-solid fa-pen-to-square"></i>
        </div>
        <div class="deleteHours clickable" onclick="deleteHours(${hours._id})">
          <i class="fa-solid fa-calendar-xmark"></i>
        </div>
      </div>
      `;
    });
    $("#hours").innerHTML = htmlString;
  });
});
