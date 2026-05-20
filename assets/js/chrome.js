// Renders the shared sidebar + topbar into <div id="chrome"> on every
// page. The markup is inlined here (not fetched from a partial) so it
// paints synchronously — important for cross-document view transitions,
// which capture the new page's first paint and would otherwise flash
// without the chrome.
//
// To update the chrome markup, edit the template literal below.

const CHROME_HTML = `
<aside class="sidebar" aria-label="Primary navigation">
  <button class="sidebar__hamburger" data-tooltip="Not part of this prototype" aria-label="Menu">
    <img src="assets/icons/bars-3.svg" alt="" width="22" height="22" />
  </button>
  <nav class="sidebar__nav" aria-label="Sections">
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Charts"><img src="assets/icons/presentation-chart-line.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Maps"><img src="assets/icons/cube.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Cloud"><img src="assets/icons/cloud.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Team"><img src="assets/icons/users.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Permissions"><img src="assets/icons/lock-closed.svg" alt="" width="20" height="20" /></a>
    <a href="./" class="sidebar__item" data-nav-key="designer-tools" aria-label="Designer tools"><img src="assets/icons/paint-brush.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Editor"><img src="assets/icons/pencil-square.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Embed"><img src="assets/icons/code-bracket.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Undo"><img src="assets/icons/arrow-uturn-left.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Settings"><img src="assets/icons/cog-6-tooth.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Chat"><img src="assets/icons/chat-bubble-left.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Help"><img src="assets/icons/question-mark-circle.svg" alt="" width="20" height="20" /></a>
  </nav>
</aside>
<header class="topbar">
  <a href="./" class="topbar__brand" data-tooltip="Not part of this prototype" aria-label="Everviz home">
    everviz<span class="topbar__brand-dot" aria-hidden="true">.</span>
  </a>
  <nav class="topbar__crumb" aria-label="Breadcrumb">
    <a href="./" class="topbar__crumb-parent" data-chrome-crumb-parent>Designer tools</a>
    <span class="topbar__crumb-sep" data-chrome-crumb-sep aria-hidden="true">/</span>
    <span data-chrome-breadcrumb>Designer tools</span>
  </nav>
</header>
`;

function renderChrome() {
  const mount = document.getElementById("chrome");
  if (!mount) return;
  mount.innerHTML = CHROME_HTML;

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

  // On the entry screen (Designer tools), hide the parent link + separator
  // so the breadcrumb shows only one segment.
  const isEntry = (title || "").toLowerCase() === "designer tools";
  if (isEntry) {
    const parent = mount.querySelector("[data-chrome-crumb-parent]");
    const sep = mount.querySelector("[data-chrome-crumb-sep]");
    if (parent) parent.style.display = "none";
    if (sep) sep.style.display = "none";
  }

  if (window.__protoInitTooltips) window.__protoInitTooltips();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderChrome);
} else {
  renderChrome();
}
