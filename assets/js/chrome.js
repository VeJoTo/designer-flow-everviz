// Loads partials/chrome.html into a <div id="chrome"> placeholder,
// then marks the active sidebar item based on <body data-screen="…">
// and writes the breadcrumb text from <body data-screen-title="…">.

(async function loadChrome() {
  const mount = document.getElementById("chrome");
  if (!mount) return;

  const res = await fetch("/partials/chrome.html");
  if (!res.ok) {
    console.error("Failed to load chrome partial", res.status);
    return;
  }
  mount.innerHTML = await res.text();

  const screen = document.body.dataset.screen;
  if (screen) {
    const active = mount.querySelector(`.sidebar__item[data-nav-key="${screen}"]`);
    if (active) active.setAttribute("aria-current", "page");
  }

  const title = document.body.dataset.screenTitle;
  if (title) {
    const crumb = mount.querySelector("[data-chrome-breadcrumb]");
    if (crumb) crumb.textContent = title;
  }

  // Re-init tooltips on the newly-inserted chrome
  if (window.__protoInitTooltips) window.__protoInitTooltips();
})();
