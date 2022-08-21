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
  eftFetch("/api/getOrg", { code: orgCode }).then(function (ret) {
    const { org, users } = ret;
    $("#orgTitle").innerHTML = org.name;
    loadUsers(users);
    loadPayPeriods(ret);
  });
});

function closeModals() {
  $$(".calendarModal").forEach(function (el) {
    el.classList.add("hidden");
  });
  $("#calendarShadow").classList.add("hidden");
}

function loadUsers(users) {
  htmlString = ``;
  users.forEach(function (user) {
    htmlString += `
      <div class="orgUser">
        <div class="orgUserName">${user.firstName} ${user.lastName}</div>
        <div class="editUser" onclick="editUser(this)"><i class="fa-solid fa-user-gear"></i></div>
        <div class="editUserModal calendarModal hidden">
          <div class="userDetailName">${user.displayName}</div>
          <button class="userDetailEdit" onclick="window.location='/user/${user.internalId}'">Edit User Profile</button>
          <div class="userDetailWeekly">Weekly hours: ${user.hourLimits.regularHours}</div>
          <div class="userDetailYearly">Yearly hours: ${user.hourLimits.maxYearly}</div>
          <div class="userDetailVacation">Vacation hours: ${user.hourLimits.vacation}</div>
        </div>
        <div class="removeUser" onclick="removeUser('${user.internalId}')"><i class="fa-solid fa-user-xmark"></i></div>
      </div>
    `;
  });
  $("#orgUsersList").innerHTML = htmlString;
}

function loadPayPeriods(org) {
  htmlString = ``;
  const { approvedPeriods, toApprove, upcoming } = org;
  fillPeriods(approvedPeriods, "#approvedList");
  fillPeriods(toApprove, "#toApproveList");
  fillPeriods(upcoming, "#upcomingList");
}

function editUser(el) {
  $("#calendarShadow").classList.remove("hidden");
  el.parentElement.querySelector(".editUserModal").classList.remove("hidden");
}

function fillPeriods(periods, el) {
  var htmlString = "";
  periods.forEach(function (period) {
    const start = DateTime.fromISO(period.start, {
      zone: "utc",
    });
    const startDate = start.toLocaleString();
    const end = DateTime.fromISO(period.end, { zone: "utc" });
    const endDate = end.toLocaleString();
    const date =
      startDate.slice(0, -5) + " - " + endDate.slice(0, -4) + endDate.slice(-2);
    htmlString += `<div class="orgPeriodDate"><a href="/myOrgs/${orgCode}/payperiod/${start
      .toString()
      .slice(0, 10)}">${date}</a></div>`;
  });

  $(el).innerHTML = htmlString;
}

function removeUser() {}
