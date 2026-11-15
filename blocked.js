"use strict";
const site = new URLSearchParams(location.search).get("site");
if (site) document.getElementById("site").textContent = site;
document.getElementById("settings").addEventListener("click", () => browser.runtime.openOptionsPage());
