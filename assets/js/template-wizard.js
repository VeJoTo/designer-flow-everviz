// Template wizard — single-page tabbed editor.
//
// Hash routing switches the active tab (the left panel); the chrome and the
// preview pane stay mounted, so selections persist across tabs (no reload).
// Handles: tab routing, project-title edit, map picker, Mini-Map controls,
// and the marker/region preset pickers.

(function () {
  const TABS = ["map", "presets", "customize", "controls", "publish"];

  const PRESETS = {
    markers: {
      title: "Choose Marker",
      items: [
        { name: "Red marker",              thumb: { map: "north-europe",   kind: "pin",  color: "#FF4D5F" } },
        { name: "Blue marker",             thumb: { map: "europe",         kind: "pin",  color: "#5B5BFF" } },
        { name: "Darkmode marker",         thumb: { map: "scandinavia",    kind: "pin",  color: "#FFFFFF", dark: true } },
        { name: "Custom font",             thumb: { map: "central-europe", kind: "pin",  color: "#28277E" } },
        { name: "Darkmode",                thumb: { map: "world",          dark: true } },
        { name: "Darkmode Country Labels", thumb: { map: "north-america",  dark: true } },
        { name: "Star marker",             thumb: { map: "mediterranean",  kind: "star", color: "#FFB020" } },
        { name: "Flag marker",             thumb: { map: "uk",             kind: "pin",  color: "#28277E" } },
        { name: "Dot marker",              thumb: { map: "scandinavia",    kind: "dot",  color: "#5B5BFF" } },
      ],
    },
    regions: {
      title: "Choose Region",
      items: [
        { name: "Filled regions",   thumb: { map: "europe",         kind: "region-fill",    color: "#5B5BFF" } },
        { name: "Outline regions",  thumb: { map: "scandinavia",    kind: "region-outline", color: "#28277E" } },
        { name: "Choropleth",       thumb: { map: "world",          kind: "choropleth" } },
        { name: "Darkmode regions", thumb: { map: "north-europe",   kind: "region-fill",    color: "#5B5BFF", dark: true } },
        { name: "Highlight regions",thumb: { map: "central-europe", kind: "region-fill",    color: "#FFB020" } },
        { name: "Bubble regions",   thumb: { map: "world",          kind: "bubble",         color: "#5B5BFF" } },
      ],
    },
  };

  // Built-in minimap presets that ship with everviz (the same set the Minimaps
  // library seeds for every user). The wizard's minimap picker reads user-saved
  // minimaps from SavedMaps("minimap") — empty for anyone who hasn't authored one
  // in the editor — so without these defaults the picker opens with nothing to
  // pick and a minimap can't be added to a template. Each has a stable id + level
  // ids so a template that references one round-trips across a save/reload.
  const MINIMAP_DEFAULTS = [
    ["mediterranean-europe", "Mediterranean Europe minimap", "europe",         false],
    ["world",                "World minimap",                "world",          false],
    ["nordic-dark",          "Nordic dark minimap",          "scandinavia",    true],
    ["united-kingdom",       "United Kingdom minimap",       "uk",             false],
    ["scandinavia",          "Scandinavia minimap",          "scandinavia",    false],
    ["central-europe",       "Central Europe minimap",       "central-europe", false],
    ["mediterranean",        "Mediterranean minimap",        "mediterranean",  false],
    ["north-africa",         "North Africa minimap",         "north-africa",   false],
    ["middle-east",          "Middle East minimap",          "middle-east",    false],
    ["north-america",        "North America minimap",        "north-america",  false],
    ["south-america",        "South America minimap",        "south-america",  false],
    ["east-asia",            "East Asia minimap",            "asia-east",      false],
    ["south-asia",           "South Asia minimap",           "asia-india",     false],
    ["australia",            "Australia minimap",            "australia",      false],
  ].map(([slug, name, img, dark]) => ({
    id: "mm-" + slug,
    name,
    thumb: `url("assets/img/maps/${img}.png")`,
    dark,
    builtIn: true,
    defaultLevelId: "mm-" + slug + "-globe",
    levels: [
      { id: "mm-" + slug + "-globe",  name: "Globe",  type: "globe" },
      { id: "mm-" + slug + "-region", name: "Region", type: "region" },
    ],
  }));

  document.addEventListener("DOMContentLoaded", () => {
    let exportApi = null; // set inside the export block; used by serialize/hydrate
    // ── Tab routing (hash) ──────────────────────────────────────────
    const tabLinks = [...document.querySelectorAll(".wizard-step")];
    const panels = [...document.querySelectorAll("[data-panel]")];
    function activateTab(name) {
      if (!TABS.includes(name)) name = "map";
      tabLinks.forEach((a) => {
        const on = a.dataset.tab === name;
        a.classList.toggle("wizard-step--active", on);
        if (on) a.setAttribute("aria-current", "step");
        else a.removeAttribute("aria-current");
      });
      panels.forEach((p) => { p.hidden = p.dataset.panel !== name; });
    }
    const fromHash = () => (location.hash || "#map").slice(1);
    window.addEventListener("hashchange", () => activateTab(fromHash()));
    activateTab(fromHash());

    // Switch tabs by setting the fragment on the CURRENT document. The page
    // sets <base href="../">, so a plain href="#tab" would resolve against
    // the base (site root) and navigate away — intercept and drive the hash.
    tabLinks.forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const name = a.dataset.tab;
        if (location.hash.slice(1) === name) activateTab(name);
        else location.hash = name;
      });
    });

    // ── Project title inline edit ───────────────────────────────────
    const title = document.querySelector("[data-wizard-title]");
    if (title) {
      let before = "";
      title.addEventListener("focus", () => {
        before = title.textContent;
        const range = document.createRange();
        range.selectNodeContents(title);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      });
      title.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); title.blur(); }
        else if (e.key === "Escape") { e.preventDefault(); title.textContent = before; title.blur(); }
      });
      title.addEventListener("blur", () => {
        const v = (title.textContent || "").replace(/\s+/g, " ").trim();
        title.textContent = v || "Untitled project";
      });
    }

    // ── Map picker → updates the shared preview ─────────────────────
    const grid = document.querySelector("[data-map-pick-grid]");
    const stage = document.querySelector("[data-preview-stage]");
    grid?.addEventListener("click", (e) => {
      const card = e.target.closest("[data-map-pick]");
      if (!card) return;
      grid.querySelectorAll(".map-pick--selected").forEach((c) => c.classList.remove("map-pick--selected"));
      card.classList.add("map-pick--selected");
      if (stage) stage.dataset.stage = card.dataset.thumb || "globe";
    });

    // ── Mini-Map controls (Customize tab) → preview overlay ─────────
    // The minimap is shown iff a minimap preset has been added (Presets tab) —
    // the preset presence IS the on/off. When a preset exists, the config rows
    // (level/allow-zoom/size/placement/icon) and the preview overlay are shown;
    // otherwise a hint points to the Presets tab. Toggled by showPresetChip /
    // clearPresetChip below.
    const overlay = document.querySelector("[data-minimap-overlay]");
    const minimapRows = document.querySelectorAll("[data-minimap-dependent]");
    const minimapHint = document.querySelector("[data-minimap-hint]");
    function setMinimapEnabled(on) {
      overlay?.classList.toggle("is-on", on);
      minimapRows.forEach((row) => { row.hidden = !on; });
      if (minimapHint) minimapHint.hidden = on;
    }
    setMinimapEnabled(false); // default: no preset yet
    // Reusable wizard dropdown: a .select trigger + a .filter-popover menu
    // of [optionAttr] options. Opens on click, single-selects (✓ on the
    // chosen row), closes on outside-click / Escape, and calls onChange.
    const setupWizSelect = (trigger, menu, valueEl, optionAttr, onChange) => {
      if (!trigger || !menu) return;
      const close = () => {
        menu.hidden = true;
        trigger.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      };
      const open = () => {
        const r = trigger.getBoundingClientRect();
        menu.style.position = "fixed";
        menu.style.left = `${r.left}px`;
        menu.style.minWidth = `${r.width}px`;
        // Render first so we can measure, then flip above the trigger when
        // there isn't enough room below (e.g. the last row in the panel).
        menu.hidden = false;
        const mh = menu.offsetHeight;
        const spaceBelow = window.innerHeight - r.bottom;
        if (spaceBelow < mh + 12 && r.top > mh + 12) {
          menu.style.top = `${Math.round(r.top - mh - 6)}px`;
        } else {
          menu.style.top = `${Math.round(r.bottom + 6)}px`;
        }
        trigger.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      };
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.hidden ? open() : close();
      });
      menu.addEventListener("click", (e) => {
        const opt = e.target.closest(`[${optionAttr}]`);
        if (!opt) return;
        menu.querySelectorAll(`[${optionAttr}]`).forEach((o) =>
          o.classList.toggle("is-selected", o === opt)
        );
        if (valueEl) valueEl.textContent = opt.textContent.trim();
        onChange?.(opt.getAttribute(optionAttr));
        close();
      });
      document.addEventListener("click", (e) => {
        if (menu.hidden) return;
        if (trigger.contains(e.target) || menu.contains(e.target)) return;
        close();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !menu.hidden) close();
      });
    };

    const size = document.querySelector("[data-minimap-size]");
    const applySize = () => {
      const px = 132 + Number(size.value || 0) * 2;
      if (overlay) { overlay.style.width = px + "px"; overlay.style.height = px + "px"; }
    };
    document.querySelectorAll("[data-stepper]").forEach((b) => {
      b.addEventListener("click", () => {
        const dir = b.dataset.stepper === "up" ? 1 : -1;
        const min = Number(size.min || 0), max = Number(size.max || 100);
        size.value = Math.max(min, Math.min(max, Number(size.value || 0) + dir));
        applySize();
      });
    });
    size?.addEventListener("change", applySize);
    // Icon dropdown → marker glyph at the centre of the minimap preview
    const marker = document.querySelector("[data-minimap-marker]");
    const ICON_SRC = {
      pin: "assets/icons/map-pin-solid.svg",
      star: "assets/icons/star-solid.svg",
    };
    const setMinimapIcon = (type) => {
      if (!marker) return;
      marker.classList.toggle("minimap-overlay__marker--dot", type === "dot");
      if (type === "none") {
        marker.hidden = true;
        return;
      }
      marker.hidden = false;
      const src = ICON_SRC[type] ? `url("${ICON_SRC[type]}")` : "none";
      marker.style.webkitMaskImage = src;
      marker.style.maskImage = src;
    };
    setupWizSelect(
      document.querySelector("[data-minimap-icon-trigger]"),
      document.querySelector("[data-minimap-icon-menu]"),
      document.querySelector("[data-minimap-icon-value]"),
      "data-icon-type",
      setMinimapIcon
    );

    // --- Minimap preset picker (lists saved minimap presets) ---
    // Presented like the marker/region presets: an "Add preset" button that,
    // once a preset is chosen, is replaced by a single chip (single-select).
    const presetTrigger = document.querySelector("[data-minimap-preset-trigger]");
    const levelValue = document.querySelector("[data-minimap-level-value]");
    const levelMenu = document.querySelector("[data-minimap-level-menu]");
    let chosenPreset = null;

    // The pool the minimap picker chooses from: the user's saved minimaps first,
    // then the shipped defaults (skipping any a saved entry shadows by id). Both
    // the picker and the round-trip's hydrate resolve presets through this so a
    // template that references a built-in default restores correctly on edit.
    function allMinimaps() {
      const saved = window.SavedMaps ? SavedMaps.list("minimap") : [];
      const savedIds = new Set(saved.map((e) => e.id));
      return [...saved, ...MINIMAP_DEFAULTS.filter((d) => !savedIds.has(d.id))];
    }

    // Show the chosen preset as a chip — built like the marker/region chips —
    // and hide the add button (a minimap uses a single preset).
    function showPresetChip(name) {
      if (!presetTrigger) return;
      const body = presetTrigger.parentElement;
      let chip = body.querySelector("[data-minimap-preset-chip]");
      if (!chip) {
        chip = document.createElement("div");
        chip.className = "wiz-preset-item";
        chip.setAttribute("data-minimap-preset-chip", "");
        chip.innerHTML =
          '<span class="wiz-preset-item__thumb" aria-hidden="true"></span>' +
          '<span class="wiz-preset-item__name" data-minimap-preset-value></span>' +
          '<button type="button" class="wiz-preset-item__remove" aria-label="Remove minimap preset">' +
          '<img src="assets/icons/x-mark.svg" alt="" width="14" height="14" /></button>';
        chip.querySelector(".wiz-preset-item__remove").addEventListener("click", clearPresetChip);
        body.insertBefore(chip, presetTrigger);
      }
      chip.querySelector("[data-minimap-preset-value]").textContent = name;
      // Use style.display (not the hidden attr) — .wiz-add's own display rule
      // would override [hidden].
      presetTrigger.style.display = "none";
      setMinimapEnabled(true); // a preset exists → show the minimap + config rows
    }
    // Remove the chip and restore the "Add preset" button.
    function clearPresetChip() {
      const chip = presetTrigger && presetTrigger.parentElement.querySelector("[data-minimap-preset-chip]");
      if (chip) chip.remove();
      chosenPreset = null;
      if (presetTrigger) presetTrigger.style.display = "";
      if (levelMenu) levelMenu.innerHTML = "";
      if (levelValue) levelValue.textContent = "Default";
      setMinimapEnabled(false); // no preset → hide the minimap + config rows
    }

    function fillLevelMenu(pr) {
      levelMenu.innerHTML = "";
      if (!pr || !pr.levels) return;
      // Default template choice = the whole level stack ("All levels"), so the
      // minimap isn't arbitrarily pinned to one zoom. A single-level preset has
      // nothing to span, so it defaults to that one level instead.
      const multi = pr.levels.length > 1;
      if (multi) {
        const allBtn = document.createElement("button");
        allBtn.type = "button";
        allBtn.className = "sort-option is-selected";
        allBtn.setAttribute("role", "option");
        allBtn.dataset.levelId = "all";
        allBtn.textContent = "All levels";
        levelMenu.appendChild(allBtn);
      }
      pr.levels.forEach((lvl) => {
        const isDefault = !multi && lvl.id === pr.defaultLevelId;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sort-option" + (isDefault ? " is-selected" : "");
        btn.setAttribute("role", "option");
        btn.dataset.levelId = lvl.id;
        btn.textContent = lvl.name;
        levelMenu.appendChild(btn);
      });
      if (multi) {
        levelValue.textContent = "All levels";
      } else {
        const def = pr.levels.find((l) => l.id === pr.defaultLevelId) || pr.levels[0];
        if (def) levelValue.textContent = def.name;
      }
    }

    presetTrigger?.addEventListener("click", async () => {
      if (!window.pickerModal) return;
      const pool = allMinimaps();
      const items = pool.map((e) => ({
        name: e.name,
        id: e.id,
        thumb: e.thumb ? { bg: e.thumb, dark: e.dark } : undefined,
      }));
      const choice = await window.pickerModal({ title: "Choose a minimap preset", items });
      if (!choice) return;
      chosenPreset = pool.find((e) => e.name === choice.name) || null;
      showPresetChip(choice.name);
      fillLevelMenu(chosenPreset);
    });

    // Level dropdown (options are (re)built when a preset is chosen).
    setupWizSelect(
      document.querySelector("[data-minimap-level-trigger]"),
      levelMenu,
      levelValue,
      "data-level-id",
      () => {}
    );

    // Placement -> move the preview overlay into a corner.
    setupWizSelect(
      document.querySelector("[data-minimap-placement-trigger]"),
      document.querySelector("[data-minimap-placement-menu]"),
      document.querySelector("[data-minimap-placement-value]"),
      "data-placement",
      (pos) => overlay?.setAttribute("data-placement", pos)
    );

    // Allow zoom is stored on the checkbox state; no preview behavior in the prototype.
    document.querySelector("[data-minimap-allow-zoom]")?.addEventListener("change", () => {});

    // ── Preset pickers (Presets tab) ────────────────────────────────
    // addPresetItem builds a chip in the given section container; used by the
    // picker handler AND by hydrateWizard when restoring a saved template.
    function addPresetItem(container, name) {
      const btn = container.querySelector("[data-add-preset]");
      const item = document.createElement("div");
      item.className = "wiz-preset-item";
      item.innerHTML =
        '<span class="wiz-preset-item__thumb" aria-hidden="true"></span>' +
        '<span class="wiz-preset-item__name"></span>' +
        '<button type="button" class="wiz-preset-item__remove" aria-label="Remove preset">' +
        '<img src="assets/icons/x-mark.svg" alt="" width="14" height="14" /></button>';
      item.querySelector(".wiz-preset-item__name").textContent = name;
      container.insertBefore(item, btn);
    }
    document.querySelectorAll("[data-add-preset]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const cfg = PRESETS[btn.dataset.addPreset];
        if (!cfg || !window.pickerModal) return;
        const choice = await window.pickerModal(cfg);
        if (!choice) return;
        addPresetItem(btn.parentElement, choice.name);
      });
    });
    document.querySelectorAll(".wiz-sections").forEach((sec) => {
      sec.addEventListener("click", (e) => {
        const rm = e.target.closest(".wiz-preset-item__remove");
        if (rm) rm.closest(".wiz-preset-item").remove();
      });
    });

    // ── Controls tab: per-category availability checkboxes ──────────
    // Each category's header checkbox decides whether the journalist gets
    // that control at all. The checkbox sits inside the <summary>, so a
    // raw click would also expand the section — we cancel that, flip the
    // box ourselves, and dim the sub-options when the category is off.
    const controlsPanel = document.querySelector("[data-controls]");
    if (controlsPanel) {
      const syncBody = (toggle) => {
        const body = toggle.closest(".wiz-section")?.querySelector(".wiz-section__body");
        if (body) body.classList.toggle("is-disabled", !toggle.checked);
      };
      controlsPanel.querySelectorAll("[data-control-toggle]").forEach(syncBody);
      controlsPanel.addEventListener("click", (e) => {
        const box = e.target.closest(".wiz-checkbox");
        if (!box || !box.closest(".wiz-section__head")) return; // sub-rows toggle natively
        e.preventDefault(); // keep the <details> from opening/closing
        const input = box.querySelector("input");
        input.checked = !input.checked;
        syncBody(input);
      });
    }

    // ── Save template: modal + persist + flag for the templates page ──
    // "Save" persists and shows a toast (stay in the wizard); "Save & view
    // templates" persists and follows its link to the template page, where
    // the freshly-saved card is highlighted as new (see saved-templates.js).
    const saveModal = document.querySelector("[data-save-modal]");
    if (saveModal) {
      const titleEl = document.querySelector("[data-wizard-title]");
      const nameInput = saveModal.querySelector("#save-template-name");
      // Editing an existing template? Start from its name (passed in the URL)
      // so it feels like editing — and Save updates that template, not a copy.
      const editParams = new URLSearchParams(location.search);
      const editingId = editParams.get("id");
      const editingName = editParams.get("name");
      if (editingName && titleEl) titleEl.textContent = editingName;
      const openSave = () => {
        if (nameInput && titleEl) nameInput.value = (titleEl.textContent || "").trim() || "Untitled project";
        saveModal.hidden = false;
        saveModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        nameInput?.focus();
        nameInput?.select();
      };
      const closeSave = () => {
        saveModal.hidden = true;
        saveModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      };
      document.querySelectorAll('[data-action="save-wizard"]').forEach((b) =>
        b.addEventListener("click", openSave)
      );
      saveModal.querySelectorAll("[data-save-modal-close]").forEach((el) =>
        el.addEventListener("click", closeSave)
      );
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !saveModal.hidden) closeSave();
      });

      const persistSave = () => {
        const name = (nameInput?.value || "").trim() || "Untitled project";
        if (titleEl) titleEl.textContent = name; // reflect rename on the bar
        const id = editingId || (window.SavedMaps ? SavedMaps.id() : "t_" + name);
        const config = serializeWizard();
        const list = window.SavedMaps ? SavedMaps.list("template") : [];
        const existing = list.find((e) => e.id === id);
        const created = existing ? existing.created : new Date().toISOString().slice(0, 10);
        const entry = { id, name, created, thumb: 'url("assets/img/maps/north-europe.png")', config };
        if (window.SavedMaps) {
          // Prepend so the just-saved template is newest-first (saved-templates.js
          // renders list() newest-first, matching the old unshift-based save()).
          SavedMaps.replaceAll("template", [entry, ...list.filter((e) => e.id !== id)]);
        }
        try { sessionStorage.setItem("everviz-new-template", id); } catch (e) {}
        return entry;
      };

      // Toast (shown for the stay-in-wizard "Save").
      const toast = document.querySelector("[data-save-toast-el]");
      const toastText = toast?.querySelector("[data-save-toast-text]");
      const toastMsg = document.body.dataset.saveToast || "Saved";
      let toastTimer;
      const showToast = () => {
        if (!toast) return;
        if (toastText) toastText.textContent = toastMsg;
        toast.hidden = false;
        requestAnimationFrame(() => toast.classList.add("is-visible"));
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          toast.classList.remove("is-visible");
          setTimeout(() => { toast.hidden = true; }, 220);
        }, 2400);
      };

      saveModal.querySelector('[data-action="save-template-stay"]')?.addEventListener("click", () => {
        persistSave();
        showToast();
      });
      // "Save & view templates" — persist, then let the anchor navigate.
      saveModal.querySelector('[data-action="save-template-go"]')?.addEventListener("click", () => {
        persistSave();
      });
    }

    // ── Publish & Export: export presets ────────────────────────────
    // A list of editable preset cards (name + platform + width/height),
    // a "default preset" picker that mirrors the card names, plus add and
    // delete. Multi-Platform presets label their size "Preview Width/
    // Height"; Video presets label it "Width/Height".
    const exportRoot = document.querySelector("[data-export-root]");
    if (exportRoot) {
      const list = exportRoot.querySelector("[data-export-list]");
      const templateNode = list.querySelector("[data-export-preset]").cloneNode(true);

      const PLATFORMS = {
        multi: { value: "Multi Platform", w: "Preview Width", h: "Preview Height" },
        video: { value: "Video", w: "Width", h: "Height" },
      };
      const INITIAL = [
        { name: "Desktop",           platform: "multi", w: 1440, h: 1024 },
        { name: "Tablet",            platform: "multi", w: 768,  h: 1024 },
        { name: "Mobile",            platform: "multi", w: 390,  h: 844 },
        { name: "Full HD Landscape", platform: "video", w: 1920, h: 1080 },
        { name: "Full HD Portrait",  platform: "video", w: 1080, h: 1920 },
      ];

      // Small dropdown: a .select trigger + a .filter-popover menu, flips
      // up when there's no room below.
      const initDropdown = (trigger, menu, valueEl, optionAttr, onChange) => {
        if (!trigger || !menu) return;
        const close = () => { menu.hidden = true; trigger.classList.remove("is-open"); trigger.setAttribute("aria-expanded", "false"); };
        const open = () => {
          const r = trigger.getBoundingClientRect();
          menu.style.position = "fixed";
          menu.style.left = `${r.left}px`;
          menu.style.minWidth = `${Math.max(r.width, 140)}px`;
          menu.hidden = false;
          const mh = menu.offsetHeight;
          const below = window.innerHeight - r.bottom;
          menu.style.top = (below < mh + 12 && r.top > mh + 12)
            ? `${Math.round(r.top - mh - 6)}px`
            : `${Math.round(r.bottom + 6)}px`;
          trigger.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
        };
        trigger.addEventListener("click", (e) => { e.stopPropagation(); menu.hidden ? open() : close(); });
        menu.addEventListener("click", (e) => {
          const opt = e.target.closest(`[${optionAttr}]`);
          if (!opt) return;
          menu.querySelectorAll(`[${optionAttr}]`).forEach((o) => o.classList.toggle("is-selected", o === opt));
          if (valueEl) valueEl.textContent = opt.textContent.trim();
          onChange?.(opt.getAttribute(optionAttr));
          close();
        });
        document.addEventListener("click", (e) => {
          if (menu.hidden) return;
          if (trigger.contains(e.target) || menu.contains(e.target)) return;
          close();
        });
        document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) close(); });
      };

      const applyPlatform = (card, key) => {
        const p = PLATFORMS[key] || PLATFORMS.multi;
        card.querySelector("[data-platform-value]").textContent = p.value;
        card.querySelector('[data-dim-label="w"]').textContent = p.w;
        card.querySelector('[data-dim-label="h"]').textContent = p.h;
        card.querySelectorAll("[data-platform]").forEach((o) => o.classList.toggle("is-selected", o.dataset.platform === key));
      };

      // Default Export Preset dropdown — its options mirror the live card
      // names, rebuilt whenever a preset is added/renamed/removed.
      const defaultTrigger = exportRoot.querySelector("[data-default-trigger]");
      const defaultMenu = exportRoot.querySelector("[data-default-menu]");
      const defaultValue = exportRoot.querySelector("[data-default-value]");
      function refreshDefaultOptions() {
        const names = [...list.querySelectorAll(".export-preset__name")].map((i) => i.value.trim() || "Untitled");
        const current = defaultValue.textContent.trim();
        defaultMenu.innerHTML = "";
        names.forEach((n) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "sort-option";
          b.setAttribute("role", "option");
          b.dataset.defaultName = n;
          b.textContent = n;
          if (n === current) b.classList.add("is-selected");
          defaultMenu.appendChild(b);
        });
        if (!names.includes(current) && names[0]) defaultValue.textContent = names[0];
      }

      const makeCard = (cfg) => {
        const card = templateNode.cloneNode(true);
        card.querySelector(".export-preset__name").value = cfg.name;
        card.querySelector("[data-export-w]").value = cfg.w;
        card.querySelector("[data-export-h]").value = cfg.h;
        applyPlatform(card, cfg.platform);
        initDropdown(
          card.querySelector("[data-platform-trigger]"),
          card.querySelector("[data-platform-menu]"),
          card.querySelector("[data-platform-value]"),
          "data-platform",
          (key) => applyPlatform(card, key)
        );
        card.querySelector(".export-preset__name").addEventListener("input", refreshDefaultOptions);
        return card;
      };

      initDropdown(defaultTrigger, defaultMenu, defaultValue, "data-default-name", () => {});

      // Width / height steppers (scoped to this panel).
      exportRoot.addEventListener("click", (e) => {
        const step = e.target.closest("[data-estep]");
        if (!step) return;
        const input = step.closest(".prop-stepper").querySelector("input");
        const dir = step.dataset.estep === "up" ? 1 : -1;
        const min = Number(input.min || 0), max = Number(input.max || 9999);
        input.value = Math.max(min, Math.min(max, Number(input.value || 0) + dir));
      });

      // Delete a preset card.
      list.addEventListener("click", (e) => {
        const del = e.target.closest("[data-export-delete]");
        if (!del) return;
        del.closest("[data-export-preset]").remove();
        refreshDefaultOptions();
      });

      // Add a new preset.
      exportRoot.querySelector("[data-export-add]")?.addEventListener("click", () => {
        const card = makeCard({ name: "New preset", platform: "multi", w: 1280, h: 720 });
        list.appendChild(card);
        refreshDefaultOptions();
        const nameField = card.querySelector(".export-preset__name");
        nameField.focus();
        nameField.select();
      });

      // Seed the initial presets (replacing the static template card).
      list.innerHTML = "";
      INITIAL.forEach((cfg) => list.appendChild(makeCard(cfg)));
      refreshDefaultOptions();
      exportApi = { list, makeCard, refreshDefaultOptions, defaultValue };
    }

    // ── Round-trip: read the whole wizard into a config blob ─────────
    function serializeWizard() {
      // Map
      const mapPick = document.querySelector("[data-map-pick-grid] .map-pick--selected");
      // Minimap
      const levelSel = document.querySelector("[data-minimap-level-menu] .is-selected");
      const placeSel = document.querySelector("[data-minimap-placement-menu] .is-selected");
      const iconSel = document.querySelector("[data-minimap-icon-menu] .is-selected");
      const minimap = {
        enabled: typeof chosenPreset !== "undefined" && !!chosenPreset,
        presetId: (typeof chosenPreset !== "undefined" && chosenPreset) ? chosenPreset.id : null,
        presetName: (typeof chosenPreset !== "undefined" && chosenPreset) ? chosenPreset.name : null,
        level: levelSel ? levelSel.dataset.levelId : null,
        allowZoom: !!document.querySelector("[data-minimap-allow-zoom]")?.checked,
        size: Number(document.querySelector("[data-minimap-size]")?.value || 0),
        placement: placeSel ? placeSel.dataset.placement : "tl",
        icon: iconSel ? iconSel.dataset.iconType : "none",
      };
      // Presets (name-keyed chips per section)
      const namesIn = (container) =>
        container ? [...container.querySelectorAll(".wiz-preset-item__name")].map((n) => n.textContent.trim()) : [];
      const markersC = document.querySelector('[data-add-preset="markers"]')?.parentElement;
      const regionsC = document.querySelector('[data-add-preset="regions"]')?.parentElement;
      const presets = { markers: namesIn(markersC), regions: namesIn(regionsC) };
      // Controls (keyed sections; ordered sub-option booleans)
      const controls = {};
      document.querySelectorAll("[data-controls] .wiz-section[data-control-key]").forEach((sec) => {
        const key = sec.dataset.controlKey;
        const head = sec.querySelector("[data-control-toggle]");
        const opts = [...sec.querySelectorAll('.wiz-section__body input[type="checkbox"]')].map((c) => c.checked);
        controls[key] = { on: !!head?.checked, opts };
      });
      // Export
      const exp = { presets: [], defaultName: null };
      if (exportApi) {
        exp.presets = [...exportApi.list.querySelectorAll("[data-export-preset]")].map((card) => ({
          name: card.querySelector(".export-preset__name").value.trim() || "Untitled",
          platform: card.querySelector("[data-platform].is-selected")?.dataset.platform || "multi",
          width: Number(card.querySelector("[data-export-w]").value || 0),
          height: Number(card.querySelector("[data-export-h]").value || 0),
        }));
        exp.defaultName = exportApi.defaultValue.textContent.trim() || null;
      }
      return {
        version: 1,
        map: { pick: mapPick ? mapPick.dataset.thumb : null },
        minimap,
        presets,
        controls,
        export: exp,
      };
    }
    window.__wizardSerialize = serializeWizard; // exposed for browser verification

    // ── Round-trip: write a config blob back into the wizard ─────────
    // Select an option in a .filter-popover-style menu: toggle is-selected,
    // set the trigger's value text, return the chosen option (or null).
    function pickMenuOption(menu, valueEl, attr, val) {
      if (!menu) return null;
      let chosen = null;
      menu.querySelectorAll("[" + attr + "]").forEach((o) => {
        const on = o.getAttribute(attr) === String(val);
        o.classList.toggle("is-selected", on);
        if (on) chosen = o;
      });
      if (chosen && valueEl) valueEl.textContent = chosen.textContent.trim();
      return chosen;
    }

    function hydrateWizard(config) {
      if (!config) return;

      // Map
      if (config.map && config.map.pick) {
        const g = document.querySelector("[data-map-pick-grid]");
        const card = g && g.querySelector('[data-map-pick][data-thumb="' + config.map.pick + '"]');
        if (card) {
          g.querySelectorAll(".map-pick--selected").forEach((c) => c.classList.remove("map-pick--selected"));
          card.classList.add("map-pick--selected");
          const st = document.querySelector("[data-preview-stage]");
          if (st) st.dataset.stage = card.dataset.thumb;
        }
      }

      // Minimap — the preset presence is the on/off; showPresetChip below
      // (called when the preset resolves) shows the overlay + config rows.
      const mm = config.minimap || {};
      const levelMenuEl = document.querySelector("[data-minimap-level-menu]");
      const levelValueEl = document.querySelector("[data-minimap-level-value]");
      if (mm.presetId || mm.presetName) {
        const pool = allMinimaps();
        const found =
          pool.find((e) => e.id === mm.presetId) ||
          pool.find((e) => e.name === mm.presetName) ||
          null;
        if (found) {
          chosenPreset = found;
          showPresetChip(found.name);
          if (typeof fillLevelMenu === "function") fillLevelMenu(found);
          if (mm.level) pickMenuOption(levelMenuEl, levelValueEl, "data-level-id", mm.level);
        } else {
          // Keep the reference so re-saving doesn't drop the (temporarily) missing
          // preset — serialize only reads chosenPreset.id/name.
          chosenPreset = { id: mm.presetId, name: mm.presetName };
          showPresetChip((mm.presetName || "Preset") + " (unavailable)");
          if (levelMenuEl) levelMenuEl.innerHTML = "";
        }
      }
      const azEl = document.querySelector("[data-minimap-allow-zoom]");
      if (azEl) azEl.checked = !!mm.allowZoom;
      const sizeEl = document.querySelector("[data-minimap-size]");
      if (sizeEl && mm.size != null) sizeEl.value = mm.size;
      pickMenuOption(
        document.querySelector("[data-minimap-placement-menu]"),
        document.querySelector("[data-minimap-placement-value]"),
        "data-placement",
        mm.placement || "tl"
      );
      overlay?.setAttribute("data-placement", mm.placement || "tl");
      pickMenuOption(
        document.querySelector("[data-minimap-icon-menu]"),
        document.querySelector("[data-minimap-icon-value]"),
        "data-icon-type",
        mm.icon || "none"
      );
      if (typeof setMinimapIcon === "function") setMinimapIcon(mm.icon || "none");

      hydrateRest(config);
    }
    window.__wizardHydrate = hydrateWizard; // exposed for browser verification
    function hydrateRest(config) {
      // Presets — clear existing chips, recreate from saved names.
      const markersC = document.querySelector('[data-add-preset="markers"]')?.parentElement;
      const regionsC = document.querySelector('[data-add-preset="regions"]')?.parentElement;
      [markersC, regionsC].forEach((c) => c && c.querySelectorAll(".wiz-preset-item").forEach((i) => i.remove()));
      (config.presets?.markers || []).forEach((n) => markersC && addPresetItem(markersC, n));
      (config.presets?.regions || []).forEach((n) => regionsC && addPresetItem(regionsC, n));

      // Controls — set each section's header toggle + sub-options by index.
      Object.entries(config.controls || {}).forEach(([key, val]) => {
        const sec = document.querySelector('[data-controls] .wiz-section[data-control-key="' + key + '"]');
        if (!sec) return;
        const head = sec.querySelector("[data-control-toggle]");
        if (head) head.checked = !!val.on;
        const body = sec.querySelector(".wiz-section__body");
        if (body) body.classList.toggle("is-disabled", !val.on);
        const boxes = [...sec.querySelectorAll('.wiz-section__body input[type="checkbox"]')];
        (val.opts || []).forEach((on, i) => { if (boxes[i]) boxes[i].checked = !!on; });
      });

      // Export — rebuild the card list from saved presets, then set default.
      if (exportApi && config.export) {
        exportApi.list.innerHTML = "";
        (config.export.presets || []).forEach((p) =>
          exportApi.list.appendChild(exportApi.makeCard({ name: p.name, platform: p.platform, w: p.width, h: p.height }))
        );
        exportApi.refreshDefaultOptions();
        if (config.export.defaultName) {
          exportApi.defaultValue.textContent = config.export.defaultName;
          exportApi.refreshDefaultOptions();
        }
      }
    }

    // On edit (?id), restore the saved template's full config.
    (function restoreOnLoad() {
      const id = new URLSearchParams(location.search).get("id");
      if (!id || !window.SavedMaps) return;
      const entry = SavedMaps.list("template").find((e) => e.id === id);
      if (!entry) return;
      // Restore the name from the entry (not just the ?name param) so editing
      // via ?id alone keeps the template's title.
      const t = document.querySelector("[data-wizard-title]");
      if (t && entry.name) t.textContent = entry.name;
      if (entry.config) hydrateWizard(entry.config);
    })();
  });
})();
