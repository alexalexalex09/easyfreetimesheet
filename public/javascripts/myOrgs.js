if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = (selector) => document.querySelectorAll(selector);
}

window.addEventListener("load", function () {
  loadMyOrgs();
});

function loadMyOrgs() {
  eftFetch(
    "/api/getMyOrgs",
    {},
    function (res) {
      var htmlString = ``;
      for (const org of res) {
        htmlString += `<div class="org"><div class="orgName">${org.name}</div><div class="orgCode"><a href="/myOrgs/${org.code}">${org.code}</a></div></div>`;
      }
      $("#orgs").innerHTML = htmlString;
    },
    function (err) {
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

function createOrg() {
  if ("#createOrg input".value != "") {
    const body = {
      name: $("#createOrg input").value,
    };
    eftFetch("/api/createOrg", body, function (res) {
      console.log("Success!");
      $("#createOrg input").value = "Success!";
      loadMyOrgs();
    });
  }
}
