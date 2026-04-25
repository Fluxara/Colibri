(function () {
  var KEY = "colibri-theme";
  var root = document.documentElement;
  var stored = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch (e) {
    /* ignore */
  }
  if (stored === "light" || stored === "dark") {
    root.setAttribute("data-theme", stored);
    return;
  }
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.setAttribute("data-theme", "dark");
  } else {
    root.setAttribute("data-theme", "light");
  }
})();
