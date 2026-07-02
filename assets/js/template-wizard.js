// Template wizard — single-page tabbed editor.
//
// Hash routing switches the active tab (the left panel); the chrome and the
// preview pane stay mounted, so selections persist across tabs (no reload).
// Handles: tab routing, project-title edit, map picker, Mini-Map controls,
// and the marker/region preset pickers.

(function () {
  const TABS = ["map", "customize", "presets", "controls", "publish"];

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
    const overlay = document.querySelector("[data-minimap-overlay]");
    // Every Mini-Map option except the on/off toggle is only relevant once
    // the minimap is on — collapse them while it's off (progressive reveal).
    const minimapEnable = document.querySelector("[data-minimap-enable]");
    const minimapRows = document.querySelectorAll("[data-minimap-dependent]");
    const setMinimapRowsShown = (on) => {
      minimapRows.forEach((row) => { row.hidden = !on; });
    };
    minimapEnable?.addEventListener("change", (e) => {
      overlay?.classList.toggle("is-on", e.target.checked);
      setMinimapRowsShown(e.target.checked);
    });
    setMinimapRowsShown(!!minimapEnable?.checked); // default: off → collapsed
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
    const presetTrigger = document.querySelector("[data-minimap-preset-trigger]");
    const presetValue = document.querySelector("[data-minimap-preset-value]");
    const levelValue = document.querySelector("[data-minimap-level-value]");
    const levelMenu = document.querySelector("[data-minimap-level-menu]");
    let chosenPreset = null;

    function fillLevelMenu(pr) {
      levelMenu.innerHTML = "";
      if (!pr || !pr.levels) return;
      pr.levels.forEach((lvl) => {
        const isDefault = lvl.id === pr.defaultLevelId;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sort-option" + (isDefault ? " is-selected" : "");
        btn.setAttribute("role", "option");
        btn.dataset.levelId = lvl.id;
        btn.textContent = lvl.name;
        levelMenu.appendChild(btn);
      });
      const def = pr.levels.find((l) => l.id === pr.defaultLevelId) || pr.levels[0];
      if (def) levelValue.textContent = def.name;
    }

    presetTrigger?.addEventListener("click", async () => {
      if (!window.pickerModal || !window.SavedMaps) return;
      const items = SavedMaps.list("minimap").map((e) => ({ name: e.name, id: e.id }));
      const choice = await window.pickerModal({ title: "Choose a minimap preset", items });
      if (!choice) return;
      chosenPreset = SavedMaps.list("minimap").find((e) => e.name === choice.name) || null;
      presetValue.textContent = choice.name;
      presetValue.classList.remove("select__value--placeholder");
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
        const entry = window.SavedMaps?.save("template", {
          id: editingId || undefined, // update the edited template instead of duplicating
          name,
          thumb: 'url("assets/img/maps/north-europe.png")',
        });
        // Tell the templates page which card to highlight as newly created.
        if (entry) {
          try { sessionStorage.setItem("everviz-new-template", entry.id); } catch (e) {}
        }
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
        enabled: !!document.querySelector("[data-minimap-enable]")?.checked,
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

      // Minimap
      const mm = config.minimap || {};
      const enableEl = document.querySelector("[data-minimap-enable]");
      if (enableEl) {
        enableEl.checked = !!mm.enabled;
        if (typeof setMinimapRowsShown === "function") setMinimapRowsShown(!!mm.enabled);
        overlay?.classList.toggle("is-on", !!mm.enabled);
      }
      const presetValueEl = document.querySelector("[data-minimap-preset-value]");
      const levelMenuEl = document.querySelector("[data-minimap-level-menu]");
      const levelValueEl = document.querySelector("[data-minimap-level-value]");
      if (mm.presetId || mm.presetName) {
        const found = window.SavedMaps
          ? SavedMaps.list("minimap").find((e) => e.id === mm.presetId)
          : null;
        if (found) {
          chosenPreset = found;
          if (presetValueEl) {
            presetValueEl.textContent = found.name;
            presetValueEl.classList.remove("select__value--placeholder");
          }
          if (typeof fillLevelMenu === "function") fillLevelMenu(found);
          if (mm.level) pickMenuOption(levelMenuEl, levelValueEl, "data-level-id", mm.level);
        } else if (presetValueEl) {
          presetValueEl.textContent = (mm.presetName || "Preset") + " (unavailable)";
          presetValueEl.classList.remove("select__value--placeholder");
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
  });
})();
