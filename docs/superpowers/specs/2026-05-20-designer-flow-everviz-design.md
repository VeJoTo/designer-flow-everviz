# designer-flow-everviz — design spec

**Date:** 2026-05-20
**Status:** Approved (initial draft)
**Author:** Vera (with Claude)

## 1. Purpose

Build a hi-fi, browser-testable click-through prototype of Everviz's **Map designer flow**, screen by screen. The artefact should look and feel like the real Everviz product so stakeholders can give meaningful feedback on the interaction design and information architecture.

## 2. Scope

### In scope

The seven Map-side screens connected in the Figma file `everviz-UX-2026-Vera`, section "Designer-flow":

| # | Screen | Figma node |
|---|---|---|
| 1 | `designer-tools` (entry) | `1:7264` |
| 2 | `map-designer` | `1:7301` |
| 3 | `base-maps-library` | `1:7624` |
| 4 | `base-map-editor/maker` | `1:8194` |
| 5 | `mini-map-library` | `1:7570` |
| 6 | `minimap-editor/maker` | `1:7678` |
| 7 | `preset-editor` | `1:7411` |

Plus the template / preset wizards:

| Screen | Figma node |
|---|---|
| `template-menu-frame` | `1:1795` |
| `customize-template-wiz-1` | `1:1831` |
| `customize-template-wiz-2` | `1:1850` |
| `customize-template-wiz-3` | `1:1870` |
| `preset-template-wiz` | `1:1890` |
| `preset-template-wiz-2` | `1:1903` |

### Out of scope

- Chart designer flow (Chart card on entry screen shows "Not part of this prototype" tooltip)
- Authentication, real user accounts, backend, persistence
- Real data — all maps/presets shown are mock content matching the Figma
- Automated tests (this is a click-through prototype, not a product)

## 3. Stack & hosting

- **Stack:** plain HTML, CSS, vanilla JS. No build step, no framework.
- **Hosting:** GitHub Pages on `main` branch of `VeJoTo/designer-flow-everviz`.
- **Public URL:** `https://vejoto.github.io/designer-flow-everviz/`
- **Tested on:** Chrome / Safari / Firefox latest. Mobile not in scope (prototype is desktop-only, matching the source design).

## 4. Sources of truth

| Aspect | Source |
|---|---|
| Screen layout | Figma `everviz-UX-2026-Vera`, section "Designer-flow" (the cleaned-up section, not `designer-flow-skisser`) |
| Colors, type, spacing | Figma `everviz-atomic-design`, page "1. Atoms" (node `1:117`) |
| Icons | Heroicons set in the atomic file |
| Interactability | Confirmed in chat per screen — user calls out what's clickable / what hovers / what navigates where |

## 5. File layout

```
designer-flow-everviz/
├── index.html                       # designer-tools (entry)
├── pages/
│   ├── map-designer.html
│   ├── base-maps-library.html
│   ├── base-map-editor.html
│   ├── mini-map-library.html
│   ├── minimap-editor.html
│   ├── preset-editor.html
│   └── wizards/
│       ├── template-menu.html
│       ├── customize-template-1.html
│       ├── customize-template-2.html
│       ├── customize-template-3.html
│       ├── preset-template-1.html
│       └── preset-template-2.html
├── partials/
│   └── chrome.html                  # sidebar + topbar markup
├── assets/
│   ├── css/
│   │   ├── tokens.css               # CSS custom properties from atomic file
│   │   ├── base.css                 # reset + typography + utility classes
│   │   ├── chrome.css               # sidebar/topbar styles
│   │   └── pages/<page>.css         # per-screen styles
│   ├── js/
│   │   ├── chrome.js                # loads partials/chrome.html, sets active nav
│   │   └── tooltip.js               # "Not part of this prototype" tooltips
│   └── icons/                       # Heroicons SVGs exported from atomic file
├── docs/
│   └── superpowers/specs/           # this doc + per-screen specs
└── README.md
```

## 6. Architecture

### 6.1 Page model — one HTML file per screen

Each screen is a real `.html` file with its own URL. This gives:
- Deep-linkable URLs for stakeholder feedback (`/pages/map-designer.html`)
- Real browser back/forward behavior
- Works natively on GitHub Pages without routing config

### 6.2 Shared chrome — JS partial loader

Sidebar and topbar are defined once in `partials/chrome.html` and injected at runtime by `assets/js/chrome.js` into a `<div id="chrome">` placeholder on every page. The script also:
- Sets the `aria-current="page"` and active visual state on the brush (Designer tools) sidebar icon
- Updates the topbar breadcrumb text based on a `data-screen-title` attribute on `<body>`

Tradeoff accepted: a tiny chrome flash on slow loads. Mitigated by inlining critical chrome CSS in `base.css` so the layout reserves space before the partial loads.

### 6.3 Navigation — plain page loads

Clicking a card or "Go to X" link triggers a normal `<a href>` navigation. No SPA routing. View Transitions API may be layered in later if the flash feels too disruptive — it degrades gracefully on unsupported browsers.

### 6.4 Tooltip behavior

`assets/js/tooltip.js` attaches behavior to any element with `data-tooltip="Not part of this prototype"`. Behavior:
- Show on hover after ~200ms delay
- Show on click for touch users
- Cursor changes to `not-allowed` on these elements
- The Chart designer card uses this; sidebar icons, hamburger, and topbar logo use this

## 7. Design tokens (`tokens.css`)

CSS custom properties extracted once from the atomic file's "1. Atoms" page. Categories:
- `--color-*` — brand purple, deep navy, cream background, neutrals, semantic states
- `--font-*` — family stacks, size scale, weights, line heights
- `--space-*` — spacing scale matching the atomic spacing component
- `--radius-*`, `--shadow-*` — corner radii and elevation shadows
- `--ease-*`, `--duration-*` — motion tokens for hover/transition states

When the atomic file changes meaningfully, we re-extract.

## 8. Icons

Exported as individual SVG files from the atomic file's Heroicons component set into `assets/icons/`. Used inline via `<svg>` (so they inherit `currentColor`) or via `<img src>` for non-themeable cases.

## 9. Per-screen workflow

For each screen the user requests:
1. Pull Figma context: `get_design_context` (layout / CSS hints) + `get_screenshot` (visual reference)
2. Confirm interactables in chat — user calls out any ambiguous element
3. Write a short per-screen spec at `docs/superpowers/specs/screens/<name>.md` listing interactables and their target
4. Branch: `screen/<name>` off `main`
5. Build the page HTML, per-screen CSS, and any JS the page needs
6. Manually test locally; verify the page works in the deployed Pages preview
7. Open a PR; user reviews the live preview URL; merge to `main`

## 10. Screen 1 — `designer-tools` interactables

| Element | Action |
|---|---|
| Chart designer card (whole card) | Tooltip "Not part of this prototype"; cursor `not-allowed`; no navigation |
| Map designer card (whole card + "Go to map designer →" link) | Navigates to `pages/map-designer.html` |
| Sidebar nav icons | Tooltip "Not part of this prototype" |
| Hamburger menu (top-left) | Tooltip "Not part of this prototype" |
| Topbar `everviz` logo | Tooltip "Not part of this prototype" |
| Brush icon in sidebar | Visually active (selected state from Figma), but not clickable |

Hover state on the Map card: subtle lift (`translateY(-2px)`) + elevated shadow + cursor `pointer`. Chart card stays static with `not-allowed` cursor.

## 11. Open questions / future decisions

- **Chart designer placeholder copy** — if "Not part of this prototype" feels too dev-y for stakeholder testing, swap to "Coming soon" or similar. Decide before first user test.
- **View Transitions API** — add if plain reloads feel jarring during walkthroughs.
- **Mobile / responsive** — currently desktop-only; reassess if testers ask for it.
- **Analytics on click-through** — nice-to-have for understanding where testers drop off; not in v1.

## 12. Non-goals

- Pixel-perfect match to a 1:1 px reference. We're matching the design language, not photo-cloning the Figma. Small spacing / weight discrepancies are acceptable if they don't change perceived feel.
- Real backend or persistence. Form state may reset on navigation; that's fine.
- Cross-screen state continuity unless explicitly designed in the Figma flow.
