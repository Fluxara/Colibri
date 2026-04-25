(function () {
  var KEY = "colibri-theme";
  var root = document.documentElement;

  function setTheme(mode) {
    root.setAttribute("data-theme", mode);
    try {
      localStorage.setItem(KEY, mode);
    } catch (e) {
      /* ignore */
    }
    updateButtons();
  }

  function updateButtons() {
    var dark = root.getAttribute("data-theme") === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", dark ? "true" : "false");
      btn.textContent = dark ? "🌞" : "🌙";
      btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    });
  }

  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var dark = root.getAttribute("data-theme") === "dark";
      setTheme(dark ? "light" : "dark");
    });
  });

  updateButtons();
})();
