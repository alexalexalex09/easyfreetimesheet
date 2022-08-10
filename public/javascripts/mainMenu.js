if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = document.querySelectorAll;
}

window.addEventListener("load", function () {
  $("#addOrgInputs input").addEventListener("keyup", function () {
    $("#addOrgInputs input").value = $(
      "#addOrgInputs input"
    ).value.toUpperCase();
  });

  getMenuOrgs();
});

function getMenuOrgs() {
  efsFetch(
    "/api/getOrgs",
    {},
    function (res) {
      var htmlString = ``;
      for (const org of res) {
        htmlString += `<div class="org"><div class="orgName">${org.name}</div><div class="orgCode">${org.code}</div></div>`;
      }
      $("#menuOrgs").innerHTML = htmlString;
    },
    function (err) {
      switch (err.err) {
        case "none":
          $("#menuOrgs").innerHTML = `
      <div class="error">No organizations found</div>`;
          break;
        default:
          $("#menuOrgs").innerHTML = `
      <div class="error">Error: ${err.err}</div>`;
          break;
      }
    }
  );
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
  setTimeout(function () {
    $("#orgMenu").classList.remove("hidden");
    setTimeout(function () {
      $("#orgMenu").classList.remove("right");
      $("#mainMenu").classList.add("left");
    }, 1);
  }, 200);
}

function closeOrgMenu() {
  setTimeout(function () {
    $("#orgMenu").classList.add("right");
    $("#mainMenu").classList.remove("left");
    setTimeout(function () {
      $("#orgMenu").classList.add("hidden");
    }, 1000);
  }, 200);
}

function joinOrg() {
  const body = { code: $("#addOrgInputs input").value };
  efsFetch("/api/joinOrg", body, function (res) {
    $("#addOrgInputs input").value = "";
    getMenuOrgs();
  });
}
