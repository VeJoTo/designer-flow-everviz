// Renders the shared sidebar + topbar into <div id="chrome"> on every
// page. The markup is inlined here (not fetched from a partial) so it
// paints synchronously — important for cross-document view transitions,
// which capture the new page's first paint and would otherwise flash
// without the chrome.
//
// To update the chrome markup, edit the template literal below.

const CHROME_HTML = `
<aside class="sidebar" aria-label="Primary navigation">
  <button class="sidebar__hamburger" aria-label="Menu">
    <img src="assets/icons/bars-3.svg" alt="" width="22" height="22" />
  </button>
  <nav class="sidebar__nav" aria-label="Sections">
    <a href="#" class="sidebar__item" aria-label="Charts"><img src="assets/icons/presentation-chart-line.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" aria-label="Maps"><img src="assets/icons/cube.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" aria-label="Cloud"><img src="assets/icons/cloud.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" aria-label="Team"><img src="assets/icons/users.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" aria-label="Permissions"><img src="assets/icons/lock-closed.svg" alt="" width="20" height="20" /></a>
    <a href="./" class="sidebar__item" data-nav-key="designer-tools" aria-label="Designer tools"><img src="assets/icons/paint-brush.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" aria-label="Editor"><img src="assets/icons/pencil-square.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" aria-label="Embed"><img src="assets/icons/code-bracket.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" aria-label="Undo"><img src="assets/icons/arrow-uturn-left.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" aria-label="Settings"><img src="assets/icons/cog-6-tooth.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" aria-label="Chat"><img src="assets/icons/chat-bubble-left.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" aria-label="Help"><img src="assets/icons/question-mark-circle.svg" alt="" width="20" height="20" /></a>
  </nav>
</aside>
<header class="topbar">
  <a href="./" class="topbar__brand" aria-label="Everviz home">
    <img src="assets/img/everviz-logo.png" alt="everviz" />
  </a>
  <nav class="topbar__crumb" aria-label="Breadcrumb" data-chrome-crumb-nav></nav>
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

  // Build the breadcrumb. body.dataset.crumbs is a JSON array of
  // {title, href} ancestors (oldest first). body.dataset.screenTitle is
  // the current leaf — rendered as plain text (not linked).
  const nav = mount.querySelector("[data-chrome-crumb-nav]");
  const title = document.body.dataset.screenTitle || "Designer tools";
  let crumbs = [];
  try {
    crumbs = JSON.parse(document.body.dataset.crumbs || "[]");
  } catch (e) {
    console.warn("invalid data-crumbs JSON, ignoring", e);
  }
  if (nav) {
    const parts = [];
    for (const c of crumbs) {
      parts.push(
        `<a class="topbar__crumb-parent" href="${c.href}">${c.title}</a>`,
        `<span class="topbar__crumb-sep" aria-hidden="true">/</span>`
      );
    }
    parts.push(`<span>${title}</span>`);
    nav.innerHTML = parts.join("");
  }

  if (window.__protoInitTooltips) window.__protoInitTooltips();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderChrome);
} else {
  renderChrome();
}
