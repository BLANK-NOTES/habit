/* =========================
   THEME ENGINE
   =========================
   Responsibilities:
   - Apply saved theme on load
   - Persist theme to localStorage
   - Notify charts & UI when theme changes
   - Provide theme color access for JS (canvas)
   ========================= */

(function () {
  "use strict";

  /* =========================
     CONSTANTS
     ========================= */
  const STORAGE_KEY = "habitTheme";
  const DEFAULT_THEME = "dark";

  /* =========================
     DOM
     ========================= */
  const themeSelect = document.getElementById("theme-select");

  /* =========================
     INTERNAL STATE
     ========================= */
  let currentTheme = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;

  /* =========================
     APPLY THEME
     ========================= */
  function applyTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);

    // Sync dropdown if present
    if (themeSelect && themeSelect.value !== theme) {
      themeSelect.value = theme;
    }

    // 🔔 Notify the app that theme changed
    dispatchThemeChange();
  }

  /* =========================
     THEME CHANGE EVENT
     ========================= */
  function dispatchThemeChange() {
    document.dispatchEvent(
      new CustomEvent("theme:change", {
        detail: {
          theme: currentTheme,
          colors: getThemeColors()
        }
      })
    );
  }

  /* =========================
     THEME COLOR ACCESS
     ========================= */
  function getThemeColors() {
    const styles = getComputedStyle(document.body);

    return {
      bgMain: styles.getPropertyValue("--bg-main").trim(),
      bgCard: styles.getPropertyValue("--bg-card").trim(),
      textMain: styles.getPropertyValue("--text-main").trim(),
      textMuted: styles.getPropertyValue("--text-muted").trim(),

      accent: styles.getPropertyValue("--accent").trim(),
      danger: styles.getPropertyValue("--accent-danger").trim(),

      done: styles.getPropertyValue("--done").trim(),
      missed: styles.getPropertyValue("--missed").trim(),
      none: styles.getPropertyValue("--none").trim(),

      border: styles.getPropertyValue("--border").trim()
    };
  }

  /* =========================
     INIT
     ========================= */
  function init() {
    applyTheme(currentTheme);

    if (themeSelect) {
      themeSelect.addEventListener("change", () => {
        applyTheme(themeSelect.value);
      });
    }
  }

  /* =========================
     PUBLIC API
     ========================= */
  window.themeEngine = {
    get current() {
      return currentTheme;
    },
    apply: applyTheme,
    colors: getThemeColors
  };

  /* =========================
     BOOT
     ========================= */
  document.addEventListener("DOMContentLoaded", init);

})();

