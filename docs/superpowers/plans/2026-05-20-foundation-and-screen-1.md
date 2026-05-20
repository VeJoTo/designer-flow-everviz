# Foundation + Screen 1 (designer-tools) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the shared foundation (tokens, chrome, icons, base styles, tooltip helper) and ship the first screen (`designer-tools`) deployed on GitHub Pages.

**Architecture:** Static HTML/CSS/JS site. Sidebar + topbar are defined once in `partials/chrome.html` and injected at runtime by `assets/js/chrome.js`. Design tokens are CSS custom properties pulled from the Figma `everviz-atomic-design` file. Icons are inline Heroicons SVGs.

**Tech Stack:** HTML5, CSS3 (custom properties), vanilla JS (ES modules). No build step. GitHub Pages.

**Branch:** `feat/foundation-and-screen-1` (single PR for foundation + first screen so reviewers see the full shape; subsequent screens get one branch each).

**Source-of-truth references:**
- Spec: `docs/superpowers/specs/2026-05-20-designer-flow-everviz-design.md`
- Figma atomic: `https://www.figma.com/design/DUj7wK97nsYhDe5O82ajoz/everviz-atomic-design` (node `1:117` = atoms page)
- Figma flow: `https://www.figma.com/design/8BEAtpEUofhQLtcCHIJ8TO/everviz-UX-2026-Vera` (node `1:7264` = designer-tools screen)
- Reference screenshot: `/Users/vera/Desktop/designer-tools-first-screen.jpg`

---

## File Structure

After this plan, the repo looks like:

```
designer-flow-everviz/
├── index.html                            (Task 9)
├── pages/map-designer.html               (Task 11 — stub only)
├── partials/chrome.html                  (Task 5)
├── assets/
│   ├── css/
│   │   ├── tokens.css                    (Task 2)
│   │   ├── base.css                      (Task 3)
│   │   ├── chrome.css                    (Task 6)
│   │   └── pages/designer-tools.css      (Task 10)
│   ├── js/
│   │   ├── chrome.js                     (Task 7)
│   │   └── tooltip.js                    (Task 8)
│   └── icons/                            (Task 4)
│       ├── bars-3.svg
│       ├── presentation-chart-line.svg
│       ├── cube.svg
│       ├── cloud.svg
│       ├── users.svg
│       ├── lock-closed.svg
│       ├── paint-brush.svg
│       ├── pencil-square.svg
│       ├── code-bracket.svg
│       ├── arrow-uturn-left.svg
│       ├── cog-6-tooth.svg
│       ├── chat-bubble-left.svg
│       ├── question-mark-circle.svg
│       ├── chart-bar-card.svg
│       ├── globe-card.svg
│       └── arrow-right.svg
├── .nojekyll                             (Task 1)
└── docs/                                 (already exists)
```

---

## Task 1: Repo skeleton + GitHub Pages

**Files:**
- Create: `.nojekyll` (empty file — disables Jekyll, ensures `_`-prefixed paths work)
- Create: `assets/`, `assets/css/`, `assets/css/pages/`, `assets/js/`, `assets/icons/`, `partials/`, `pages/` (empty directories tracked with a `.gitkeep` placeholder in each leaf so they exist before files land)

- [ ] **Step 1: Create branch**

```bash
cd /Users/vera/Documents/designer-flow-everviz
git checkout -b feat/foundation-and-screen-1
```

- [ ] **Step 2: Create directory tree and .nojekyll**

```bash
mkdir -p assets/css/pages assets/js assets/icons partials pages
touch .nojekyll
```

- [ ] **Step 3: Enable GitHub Pages on main**

```bash
gh api -X POST repos/VeJoTo/designer-flow-everviz/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

Expected: JSON response with `"status": "queued"` or `"built"`. If it errors with "Pages site already exists" that's fine.

- [ ] **Step 4: Commit skeleton**

```bash
git add .nojekyll
git commit -m "chore: add .nojekyll for GitHub Pages"
```

(Empty directories aren't tracked by git — they'll appear once we put files in them.)

---

## Task 2: Design tokens (`assets/css/tokens.css`)

**Files:**
- Create: `assets/css/tokens.css`

**Source:** Extract from the Figma atomic file — pull `get_variable_defs` for node `1:117` and translate to CSS custom properties. The reference screenshot's palette (deep navy `#10153D`-ish, purple `#5B5BFF`-ish, cream `#FAF5EA`-ish, white card, charcoal text) tells us the families we need.

- [ ] **Step 1: Pull variable definitions from Figma**

Use `mcp__plugin_figma_figma__get_variable_defs` on `fileKey=DUj7wK97nsYhDe5O82ajoz`, `nodeId=1:117`. Save the raw response to `.figma-cache/atomic-variables.json` (gitignored).

- [ ] **Step 2: Write tokens.css from the Figma values**

Create `assets/css/tokens.css`:

```css
:root {
  /* Colors — pulled from Figma everviz-atomic-design / 1. Atoms / Colors.
     Replace these with the exact hex values from get_variable_defs. */
  --color-bg-app: #FAF5EA;          /* cream page background */
  --color-bg-surface: #FFFFFF;       /* white cards */
  --color-bg-sidebar: #10153D;       /* deep navy sidebar */
  --color-bg-topbar: #FFFFFF;
  --color-text-primary: #10153D;     /* navy headings */
  --color-text-body: #2A2F5C;
  --color-text-muted: #6A6E8A;
  --color-text-on-dark: #FFFFFF;
  --color-text-link: #5B5BFF;        /* purple link */
  --color-brand-purple: #5B5BFF;
  --color-brand-purple-soft: #E6E6FF; /* card icon backdrop */
  --color-accent-dot: #FF4D6D;       /* the red dot in the everviz logo */
  --color-border-subtle: #ECE8DD;

  /* Typography */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-display: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --fs-display: 56px;
  --fs-h1: 40px;
  --fs-h2: 28px;
  --fs-body: 16px;
  --fs-small: 14px;
  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;
  --lh-tight: 1.15;
  --lh-body: 1.5;

  /* Spacing scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-8: 48px;
  --space-10: 64px;
  --space-12: 96px;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  /* Shadows */
  --shadow-card: 0 2px 8px rgba(16, 21, 61, 0.06);
  --shadow-card-hover: 0 8px 20px rgba(16, 21, 61, 0.10);

  /* Motion */
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);

  /* Sidebar geometry */
  --sidebar-width: 56px;
  --topbar-height: 64px;
}
```

If `get_variable_defs` returns concrete values, **overwrite the hex codes above with the Figma values**. The comments stay as documentation.

- [ ] **Step 3: Add .figma-cache to .gitignore**

```bash
echo ".figma-cache/" >> .gitignore
echo ".DS_Store" >> .gitignore
```

- [ ] **Step 4: Manual verification**

Open `assets/css/tokens.css` in a text editor; confirm all custom properties are present and values look like the screenshot palette (no `undefined`, no Figma placeholder strings like `{token.x.y}`).

- [ ] **Step 5: Commit**

```bash
git add .gitignore assets/css/tokens.css
git commit -m "feat: add design tokens extracted from atomic file"
```

---

## Task 3: Base styles (`assets/css/base.css`)

**Files:**
- Create: `assets/css/base.css`

- [ ] **Step 1: Write base.css**

```css
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--font-sans);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--color-text-body);
  background: var(--color-bg-app);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
img, svg { display: block; max-width: 100%; }
button { font: inherit; cursor: pointer; background: none; border: none; padding: 0; color: inherit; }
a { color: var(--color-text-link); text-decoration: none; }
h1, h2, h3, h4 { color: var(--color-text-primary); line-height: var(--lh-tight); margin: 0; }

/* Layout shell: sidebar + main */
.app {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  min-height: 100vh;
}
.app > main {
  display: grid;
  grid-template-rows: var(--topbar-height) 1fr;
}

/* Tooltip (used by tooltip.js) */
.proto-tooltip {
  position: fixed;
  z-index: 9999;
  background: var(--color-text-primary);
  color: var(--color-text-on-dark);
  font-size: var(--fs-small);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  pointer-events: none;
  opacity: 0;
  transform: translateY(2px);
  transition: opacity var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
}
.proto-tooltip.is-visible { opacity: 1; transform: translateY(0); }
[data-tooltip] { cursor: not-allowed; }
```

- [ ] **Step 2: Manual verification**

Inspect the file; confirm no token references like `var(--color-doesnt-exist)` — every `var(--…)` must resolve against `tokens.css`.

- [ ] **Step 3: Commit**

```bash
git add assets/css/base.css
git commit -m "feat: add base styles (reset, layout shell, tooltip)"
```

---

## Task 4: Heroicons SVGs

**Files:**
- Create: 16 SVG files in `assets/icons/` (see File Structure above)

**Source:** Heroicons MIT-licensed icon set, mirrored in the Figma atomic file. Use the public Heroicons "outline" style at 24×24 with stroke `currentColor` so the same file works on light and dark backgrounds.

- [ ] **Step 1: Download icons from Heroicons CDN**

```bash
cd /Users/vera/Documents/designer-flow-everviz/assets/icons

for icon in bars-3 cube cloud users lock-closed paint-brush pencil-square \
            code-bracket arrow-uturn-left cog-6-tooth chat-bubble-left-right \
            question-mark-circle chart-bar arrow-right; do
  curl -sS -o "$icon.svg" "https://cdn.jsdelivr.net/npm/heroicons@2.1.5/24/outline/$icon.svg"
done

# Rename chat-bubble-left-right to match our list
mv chat-bubble-left-right.svg chat-bubble-left.svg

# Card icons: chart-bar already downloaded above for sidebar reuse — duplicate as card glyph
cp chart-bar.svg chart-bar-card.svg
# Globe for Map card — heroicons has globe-europe-africa
curl -sS -o globe-card.svg "https://cdn.jsdelivr.net/npm/heroicons@2.1.5/24/outline/globe-europe-africa.svg"

# Sidebar "first" icon in the screenshot looks like a small chart-bar inside a frame — heroicons "presentation-chart-line" is the closest
curl -sS -o presentation-chart-line.svg "https://cdn.jsdelivr.net/npm/heroicons@2.1.5/24/outline/presentation-chart-line.svg"

ls -1
```

Expected: 16 SVG files, each ~500–1500 bytes, opens as a valid `<svg>` with `stroke="currentColor"`.

- [ ] **Step 2: Spot-check one icon**

```bash
head -3 assets/icons/paint-brush.svg
```

Expected: starts with `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"...`. If you see HTML (a 404 page), the CDN URL was wrong — fix and re-run.

- [ ] **Step 3: Commit**

```bash
git add assets/icons/
git commit -m "feat: add Heroicons SVGs for sidebar and cards"
```

---

## Task 5: Chrome partial markup (`partials/chrome.html`)

**Files:**
- Create: `partials/chrome.html`

- [ ] **Step 1: Write the partial**

```html
<aside class="sidebar" aria-label="Primary navigation">
  <button class="sidebar__hamburger" data-tooltip="Not part of this prototype" aria-label="Menu">
    <img src="/assets/icons/bars-3.svg" alt="" width="22" height="22" />
  </button>
  <nav class="sidebar__nav" aria-label="Sections">
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Charts"><img src="/assets/icons/presentation-chart-line.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Maps"><img src="/assets/icons/cube.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Cloud"><img src="/assets/icons/cloud.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Team"><img src="/assets/icons/users.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Permissions"><img src="/assets/icons/lock-closed.svg" alt="" width="20" height="20" /></a>
    <a href="/" class="sidebar__item" data-nav-key="designer-tools" aria-label="Designer tools"><img src="/assets/icons/paint-brush.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Editor"><img src="/assets/icons/pencil-square.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Embed"><img src="/assets/icons/code-bracket.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Undo"><img src="/assets/icons/arrow-uturn-left.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Settings"><img src="/assets/icons/cog-6-tooth.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Chat"><img src="/assets/icons/chat-bubble-left.svg" alt="" width="20" height="20" /></a>
    <a href="#" class="sidebar__item" data-tooltip="Not part of this prototype" aria-label="Help"><img src="/assets/icons/question-mark-circle.svg" alt="" width="20" height="20" /></a>
  </nav>
</aside>
<header class="topbar">
  <a href="/" class="topbar__brand" data-tooltip="Not part of this prototype" aria-label="Everviz home">
    everviz<span class="topbar__brand-dot" aria-hidden="true">.</span>
  </a>
  <nav class="topbar__crumb" aria-label="Breadcrumb">
    <span data-chrome-breadcrumb>Designer tools</span>
  </nav>
</header>
```

- [ ] **Step 2: Manual verification**

Confirm in the file: every `data-tooltip` element has the exact string `Not part of this prototype` (no typos — `tooltip.js` matches on this). The brush icon is the only sidebar item without a tooltip and uses `data-nav-key="designer-tools"`.

- [ ] **Step 3: Commit**

```bash
git add partials/chrome.html
git commit -m "feat: add shared chrome partial (sidebar + topbar)"
```

---

## Task 6: Chrome styles (`assets/css/chrome.css`)

**Files:**
- Create: `assets/css/chrome.css`

- [ ] **Step 1: Write chrome.css**

```css
/* Sidebar */
.sidebar {
  background: var(--color-bg-sidebar);
  color: var(--color-text-on-dark);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-3) 0;
  gap: var(--space-2);
  grid-row: 1 / -1;
}
.sidebar__hamburger,
.sidebar__item {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  color: rgba(255, 255, 255, 0.78);
  transition: background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
}
.sidebar__nav { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-3); }
.sidebar__item img,
.sidebar__hamburger img { filter: brightness(0) invert(1); opacity: 0.85; }
.sidebar__item[data-tooltip]:hover,
.sidebar__hamburger:hover { background: rgba(255, 255, 255, 0.06); }
.sidebar__item[aria-current="page"] {
  background: var(--color-brand-purple);
  color: var(--color-text-on-dark);
}
.sidebar__item[aria-current="page"] img { opacity: 1; }

/* Topbar */
.topbar {
  background: var(--color-bg-topbar);
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: 0 var(--space-6);
  border-bottom: 1px solid var(--color-border-subtle);
}
.topbar__brand {
  color: var(--color-text-primary);
  font-weight: var(--fw-bold);
  font-size: 24px;
  letter-spacing: -0.01em;
  position: relative;
}
.topbar__brand-dot {
  color: var(--color-accent-dot);
  position: absolute;
  top: -2px;
  right: -3px;
  font-size: 18px;
}
.topbar__crumb {
  color: var(--color-text-link);
  font-size: var(--fs-body);
}
```

- [ ] **Step 2: Manual verification**

Confirm every `var(--…)` resolves against `tokens.css` (no typos).

- [ ] **Step 3: Commit**

```bash
git add assets/css/chrome.css
git commit -m "feat: add chrome (sidebar + topbar) styles"
```

---

## Task 7: Chrome loader (`assets/js/chrome.js`)

**Files:**
- Create: `assets/js/chrome.js`

- [ ] **Step 1: Write chrome.js**

```js
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
```

- [ ] **Step 2: Manual verification**

Read through: confirm the fetch path is `/partials/chrome.html` (absolute from site root — works under GitHub Pages project URLs only if the site is published at the **repo root**, which it is for `vejoto.github.io/designer-flow-everviz/`). If GH Pages serves under a sub-path that breaks absolute paths, we'll revisit; for now the convention is absolute paths everywhere.

- [ ] **Step 3: Commit**

```bash
git add assets/js/chrome.js
git commit -m "feat: chrome loader injects sidebar/topbar and sets active state"
```

---

## Task 8: Tooltip helper (`assets/js/tooltip.js`)

**Files:**
- Create: `assets/js/tooltip.js`

- [ ] **Step 1: Write tooltip.js**

```js
// Attaches hover/click tooltips to any element with [data-tooltip="…"].
// Re-runnable: exposes window.__protoInitTooltips() so chrome.js can re-init
// after injecting the chrome partial.

(function () {
  let tooltipEl;
  let hideTimer;

  function ensureNode() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement("div");
    tooltipEl.className = "proto-tooltip";
    tooltipEl.setAttribute("role", "tooltip");
    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  function show(target) {
    const text = target.getAttribute("data-tooltip");
    if (!text) return;
    const node = ensureNode();
    node.textContent = text;
    const rect = target.getBoundingClientRect();
    const left = rect.left + rect.width / 2;
    const top = rect.bottom + 8;
    node.style.left = `${Math.round(left)}px`;
    node.style.top = `${Math.round(top)}px`;
    node.style.transform = `translate(-50%, 0)`;
    requestAnimationFrame(() => node.classList.add("is-visible"));
    clearTimeout(hideTimer);
  }

  function hide() {
    if (!tooltipEl) return;
    tooltipEl.classList.remove("is-visible");
  }

  function bind(target) {
    if (target.__protoTooltipBound) return;
    target.__protoTooltipBound = true;
    target.addEventListener("mouseenter", () => show(target));
    target.addEventListener("mouseleave", hide);
    target.addEventListener("focus", () => show(target));
    target.addEventListener("blur", hide);
    target.addEventListener("click", (e) => {
      e.preventDefault();
      show(target);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, 1500);
    });
  }

  function init() {
    document.querySelectorAll("[data-tooltip]").forEach(bind);
  }

  window.__protoInitTooltips = init;
  document.addEventListener("DOMContentLoaded", init);
})();
```

- [ ] **Step 2: Manual verification**

Confirm `window.__protoInitTooltips` is exported so `chrome.js` can call it after injecting markup.

- [ ] **Step 3: Commit**

```bash
git add assets/js/tooltip.js
git commit -m "feat: tooltip helper for non-functional chrome elements"
```

---

## Task 9: First screen markup (`index.html`)

**Files:**
- Create: `index.html`

- [ ] **Step 1: Pull design context from Figma for fidelity**

Use `mcp__plugin_figma_figma__get_design_context` on `fileKey=8BEAtpEUofhQLtcCHIJ8TO`, `nodeId=1:7264`. Save the response under `.figma-cache/screen-designer-tools-context.json`. Read it and align padding/font-sizes in this task and Task 10 to what Figma reports if they differ from the values below.

- [ ] **Step 2: Write index.html**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=1280" />
  <title>Designer tools · everviz prototype</title>
  <link rel="stylesheet" href="/assets/css/tokens.css" />
  <link rel="stylesheet" href="/assets/css/base.css" />
  <link rel="stylesheet" href="/assets/css/chrome.css" />
  <link rel="stylesheet" href="/assets/css/pages/designer-tools.css" />
</head>
<body data-screen="designer-tools" data-screen-title="Designer tools">
  <div class="app">
    <div id="chrome" class="chrome-mount"></div>
    <main>
      <section class="screen screen--designer-tools">
        <header class="screen__head">
          <h1>Designer tools</h1>
          <p>Choose your design tool to create custom charts or maps. Set up templates, presets, and styles to streamline your workflow.</p>
        </header>
        <div class="cards">
          <article class="card card--disabled" data-tooltip="Not part of this prototype" aria-disabled="true">
            <div class="card__icon"><img src="/assets/icons/chart-bar-card.svg" alt="" width="28" height="28" /></div>
            <h2 class="card__title">Chart designer</h2>
            <p class="card__desc">Create and customize chart templates with company branding, colors, fonts and styles.</p>
            <span class="card__cta card__cta--disabled">Go to chart designer <img src="/assets/icons/arrow-right.svg" alt="" width="18" height="18" /></span>
          </article>
          <a class="card card--link" href="/pages/map-designer.html">
            <div class="card__icon"><img src="/assets/icons/globe-card.svg" alt="" width="28" height="28" /></div>
            <h2 class="card__title">Map designer</h2>
            <p class="card__desc">Design custom base map styles, create presets for icons, labels, markers, and regions and build map templates.</p>
            <span class="card__cta">Go to map designer <img src="/assets/icons/arrow-right.svg" alt="" width="18" height="18" /></span>
          </a>
        </div>
      </section>
    </main>
  </div>
  <script src="/assets/js/tooltip.js" defer></script>
  <script src="/assets/js/chrome.js" defer></script>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add designer-tools entry screen markup"
```

---

## Task 10: First screen styles (`assets/css/pages/designer-tools.css`)

**Files:**
- Create: `assets/css/pages/designer-tools.css`

- [ ] **Step 1: Write the page styles**

```css
.screen--designer-tools {
  padding: var(--space-8) var(--space-10);
  max-width: 1100px;
}
.screen__head h1 {
  font-size: var(--fs-display);
  font-weight: var(--fw-bold);
  letter-spacing: -0.02em;
  margin-bottom: var(--space-4);
}
.screen__head p {
  color: var(--color-text-primary);
  max-width: 560px;
  margin: 0 0 var(--space-8);
}

.cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
  max-width: 760px;
}
.card {
  background: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  color: var(--color-text-primary);
  transition: transform var(--duration-base) var(--ease-out),
              box-shadow var(--duration-base) var(--ease-out);
}
.card--link:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}
.card--disabled { cursor: not-allowed; opacity: 0.92; }
.card--disabled:hover { transform: none; box-shadow: var(--shadow-card); }
.card__icon {
  width: 56px;
  height: 56px;
  background: var(--color-brand-purple-soft);
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  margin-bottom: var(--space-3);
}
.card__icon img { color: var(--color-brand-purple); }
.card__title { font-size: var(--fs-h2); font-weight: var(--fw-bold); margin: 0; }
.card__desc { color: var(--color-text-body); margin: 0; }
.card__cta {
  margin-top: var(--space-4);
  color: var(--color-text-link);
  font-weight: var(--fw-semibold);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.card__cta img { filter: invert(36%) sepia(98%) saturate(2300%) hue-rotate(228deg) brightness(98%) contrast(101%); }
.card__cta--disabled { color: var(--color-text-muted); }
.card__cta--disabled img { filter: none; opacity: 0.5; }
```

- [ ] **Step 2: Local browser check**

```bash
python3 -m http.server 4173 &
SERVER_PID=$!
sleep 1
open "http://localhost:4173/"
```

Verify in browser:
- Sidebar shows 12 icons + hamburger, brush is highlighted in purple
- Topbar shows `everviz.` (red dot) and "Designer tools" breadcrumb
- Page shows "Designer tools" h1, description, two cards side-by-side
- Hovering the **Map designer** card lifts it and shows pointer cursor
- Hovering the **Chart designer** card shows `Not part of this prototype` tooltip and `not-allowed` cursor
- Hovering any sidebar icon (except brush) shows the same tooltip
- Clicking Map designer card navigates to `/pages/map-designer.html` (404 OK at this step — fixed in Task 11)

Stop the server: `kill $SERVER_PID`

- [ ] **Step 3: Commit**

```bash
git add assets/css/pages/designer-tools.css
git commit -m "feat: style designer-tools entry screen"
```

---

## Task 11: `pages/map-designer.html` stub

**Files:**
- Create: `pages/map-designer.html`

The Map designer screen is the subject of the next plan. For now, ship a stub so the navigation works.

- [ ] **Step 1: Write the stub**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Map designer · everviz prototype</title>
  <link rel="stylesheet" href="/assets/css/tokens.css" />
  <link rel="stylesheet" href="/assets/css/base.css" />
  <link rel="stylesheet" href="/assets/css/chrome.css" />
  <style>
    .placeholder { padding: var(--space-10); }
    .placeholder a { display: inline-block; margin-top: var(--space-4); }
  </style>
</head>
<body data-screen="designer-tools" data-screen-title="Map designer">
  <div class="app">
    <div id="chrome" class="chrome-mount"></div>
    <main>
      <section class="placeholder">
        <h1>Map designer</h1>
        <p>This screen will be built in the next iteration. Vera will send the screenshot next.</p>
        <a href="/">← Back to Designer tools</a>
      </section>
    </main>
  </div>
  <script src="/assets/js/tooltip.js" defer></script>
  <script src="/assets/js/chrome.js" defer></script>
</body>
</html>
```

- [ ] **Step 2: Verify navigation**

```bash
python3 -m http.server 4173 &
SERVER_PID=$!
sleep 1
open "http://localhost:4173/"
```

Click Map designer card → page changes to the stub, sidebar/topbar still render correctly, "Back to Designer tools" link returns you to `/`.

Stop server: `kill $SERVER_PID`

- [ ] **Step 3: Commit**

```bash
git add pages/map-designer.html
git commit -m "feat: add map-designer stub so first-screen navigation lands"
```

---

## Task 12: Deploy and verify on GitHub Pages

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/foundation-and-screen-1
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat: foundation + designer-tools screen" --body "$(cat <<'EOF'
## Summary
- Sets up tokens, base styles, chrome partial loader, tooltip helper
- Ships first screen `designer-tools` and a stub for `map-designer`
- GitHub Pages enabled at /

## Test plan
- [ ] Visit https://vejoto.github.io/designer-flow-everviz/ (wait ~1 min after merge for first Pages build)
- [ ] Sidebar: brush icon highlighted, others show "Not part of this prototype" tooltip
- [ ] Map designer card lifts on hover, navigates to /pages/map-designer.html
- [ ] Chart designer card shows tooltip, cursor not-allowed
- [ ] Topbar shows everviz logo with red dot, "Designer tools" crumb
EOF
)"
```

- [ ] **Step 3: Merge and watch deploy**

After review, merge the PR. Then watch the Pages deploy run:

```bash
gh run watch
```

- [ ] **Step 4: Production smoke test**

Open `https://vejoto.github.io/designer-flow-everviz/`. Repeat the verification steps from Task 10's browser check — everything should work identically against the hosted URL.

If absolute paths (`/assets/...`, `/partials/...`) 404 because Pages serves under `/designer-flow-everviz/…`, fix forward by making paths relative (`./assets/...`) in a follow-up commit. **This is the most likely real-world issue to surface.**

---

## Definition of done

- All 12 tasks committed on `feat/foundation-and-screen-1`
- PR merged to `main`
- `https://vejoto.github.io/designer-flow-everviz/` loads, looks like the reference screenshot, and the Map designer card navigates to the stub
- Spec section 10 (first screen interactables) is fully realized
