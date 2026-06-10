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
    document.querySelector("[data-minimap-enable]")?.addEventListener("change", (e) => {
      overlay?.classList.toggle("is-on", e.target.checked);
    });
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
        menu.style.top = `${r.bottom + 6}px`;
        menu.style.left = `${r.left}px`;
        menu.style.minWidth = `${r.width}px`;
        menu.hidden = false;
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

    // Border type dropdown → overlay border style (off / solid / dashed / dotted)
    setupWizSelect(
      document.querySelector("[data-minimap-border-trigger]"),
      document.querySelector("[data-minimap-border-menu]"),
      document.querySelector("[data-minimap-border-value]"),
      "data-border-type",
      (type) => overlay?.setAttribute("data-border", type)
    );
    const hex = document.querySelector("[data-minimap-color-hex]");
    const color = document.querySelector("[data-minimap-color]");
    const swatch = color?.closest(".color-input__swatch");
    const applyColor = (v) => {
      if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
      if (hex) hex.value = v.toUpperCase();
      if (color) color.value = v;
      if (swatch) swatch.style.background = v;
      overlay?.style.setProperty("--minimap-border-color", v);
    };
    color?.addEventListener("input", (e) => applyColor(e.target.value));
    hex?.addEventListener("change", (e) => applyColor(e.target.value.trim()));

    // Border thickness stepper → overlay border width (px)
    const bWidth = document.querySelector("[data-minimap-border-width]");
    const applyBorderWidth = () => {
      if (!bWidth) return;
      const min = Number(bWidth.min || 1), max = Number(bWidth.max || 8);
      const v = Math.max(min, Math.min(max, Number(bWidth.value || min)));
      bWidth.value = v;
      overlay?.style.setProperty("--minimap-border-width", v + "px");
    };
    document.querySelectorAll("[data-bw-step]").forEach((b) => {
      b.addEventListener("click", () => {
        const dir = b.dataset.bwStep === "up" ? 1 : -1;
        if (bWidth) bWidth.value = Number(bWidth.value || 2) + dir;
        applyBorderWidth();
      });
    });
    bWidth?.addEventListener("change", applyBorderWidth);
    applyBorderWidth(); // seed --minimap-border-width from the default

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

    // ── Preset pickers (Presets tab) ────────────────────────────────
    document.querySelectorAll("[data-add-preset]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const cfg = PRESETS[btn.dataset.addPreset];
        if (!cfg || !window.pickerModal) return;
        const choice = await window.pickerModal(cfg);
        if (!choice) return;
        const item = document.createElement("div");
        item.className = "wiz-preset-item";
        item.innerHTML =
          '<span class="wiz-preset-item__thumb" aria-hidden="true"></span>' +
          '<span class="wiz-preset-item__name"></span>' +
          '<button type="button" class="wiz-preset-item__remove" aria-label="Remove preset">' +
          '<img src="assets/icons/x-mark.svg" alt="" width="14" height="14" /></button>';
        item.querySelector(".wiz-preset-item__name").textContent = choice.name;
        btn.parentElement.insertBefore(item, btn);
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
  });
})();
