if (typeof $ == "undefined") {
  $ = (selector) => document.querySelector(selector);
}
if (typeof $$ == "undefined") {
  $$ = document.querySelectorAll;
}

window.addEventListener("load", function () {
  efsFetch(
    "/api/getMyOrgs",
    {},
    function (res) {
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
});

function createOrg() {
  if ("#createOrg input".value != "") {
    const body = {
      name: $("#createOrg input").value,
    };
    efsFetch("/api/createOrg", body, function (res) {
      console.log("Success!");
      $("#createOrg input").value = "Success!";
    });
  }
}
