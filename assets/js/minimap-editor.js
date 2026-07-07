// Minimap editor controller. Renders a 3-pane editor from a preset in memory.
(function () {
  const M = window.MinimapModel;
  if (!M) return;

  // --- State ---
  let preset = M.makeDefaultPreset();
  let selectedId = preset.levels[0].id;

  // --- DOM refs ---
  const $ = (sel) => document.querySelector(sel);
  const levelsEl = $("[data-mm-levels]");
  const nameEl = $("[data-mm-level-name]");
  const typeEl = $("[data-mm-level-type]");
  const fieldsEl = $("[data-mm-fields]");
  const previewLabelEl = $("[data-mm-preview-label]");

  function selectedLevel() {
    return preset.levels.find((l) => l.id === selectedId) || preset.levels[0];
  }

  // --- Render: level rail ---
  function renderRail() {
    levelsEl.innerHTML = "";
    M.sortLevels(preset.levels).forEach((lvl) => {
      const li = document.createElement("li");
      li.className = "mm-level" + (lvl.id === selectedId ? " is-selected" : "");
      li.dataset.levelId = lvl.id;
      const isDefault = lvl.id === preset.defaultLevelId;
      li.innerHTML =
        '<span class="mm-level__thumb" style="' + thumbStyle(lvl) + '"></span>' +
        '<span class="mm-level__body">' +
        '<span class="mm-level__name"></span>' +
        '<span class="mm-level__type">' + (M.TYPE_LABEL[lvl.type] || "Level") + "</span>" +
        "</span>" +
        (isDefault ? '<span class="mm-level__default">Default</span>' : "") +
        '<button class="mm-level__menu" aria-label="More options" data-level-menu>' +
        '<img src="assets/icons/ellipsis-vertical.svg" alt="" width="18" height="18" /></button>';
      li.querySelector(".mm-level__name").textContent = lvl.name;
      levelsEl.appendChild(li);
    });
  }

  // A flat swatch for the rail thumbnail (land colour over background).
  function thumbStyle(lvl) {
    const s = lvl.settings;
    const bg = s.background || "#fff";
    const land = lvl.schema === "physical" ? s.water : s.land;
    return "background-color:" + bg + ";box-shadow:inset 0 0 0 8px " + (land || "#ddd") + ";";
  }

  // --- Render: settings pane for the selected level ---
  function renderSettings() {
    const lvl = selectedLevel();
    nameEl.textContent = lvl.name;
    const schemaLabel =
      lvl.schema === "physical" ? "Physical · water, land, background" : "Political · land, stroke, opacity, background";
    typeEl.textContent = schemaLabel;

    fieldsEl.innerHTML = "";
    const usingCustom = !!lvl.customStyle;
    M.SCHEMAS[lvl.schema].fields.forEach((f) => {
      const row = document.createElement("div");
      row.className = "mm-field";
      const label = document.createElement("span");
      label.className = "mm-field__label";
      label.textContent = f.label;
      row.appendChild(label);
      row.appendChild(buildControl(lvl, f, usingCustom));
      fieldsEl.appendChild(row);
    });
    renderCustomState(lvl);
    if (window.ColorPicker) window.ColorPicker.enhanceAll(fieldsEl);
  }

  function buildControl(lvl, f, disabled) {
    if (f.kind === "color") {
      const wrap = document.createElement("label");
      wrap.className = "color-input";
      const hex = document.createElement("input");
      hex.type = "text";
      hex.className = "color-input__hex";
      hex.maxLength = 7;
      hex.value = lvl.settings[f.key];
      hex.disabled = disabled;
      const swatch = document.createElement("span");
      swatch.className = "color-input__swatch";
      swatch.style.background = lvl.settings[f.key];
      const picker = document.createElement("input");
      picker.type = "color";
      picker.value = lvl.settings[f.key];
      picker.disabled = disabled;
      picker.setAttribute("aria-label", f.label);
      const apply = (v) => {
        if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
        lvl.settings[f.key] = v;
        hex.value = v;
        swatch.style.background = v;
        picker.value = v;
        renderPreview();
        renderRail();
      };
      picker.addEventListener("input", (e) => apply(e.target.value));
      hex.addEventListener("change", (e) => apply(e.target.value.trim()));
      swatch.appendChild(picker);
      wrap.appendChild(hex);
      wrap.appendChild(swatch);
      return wrap;
    }
    // number
    const input = document.createElement("input");
    input.type = "number";
    input.className = "prop-input prop-input--number";
    input.value = lvl.settings[f.key];
    if (f.min != null) input.min = f.min;
    if (f.max != null) input.max = f.max;
    input.disabled = disabled;
    input.addEventListener("change", () => {
      let v = Number(input.value);
      if (f.min != null) v = Math.max(f.min, v);
      if (f.max != null) v = Math.min(f.max, v);
      input.value = v;
      lvl.settings[f.key] = v;
      renderPreview();
    });
    return input;
  }

  // --- Render: preview ---
  // Render the selected level into the live preview. MinimapRender draws every
  // level as a styled vector locator on a canvas (globe = orthographic sphere,
  // region = mercator land in the level's own colours). Framed by the level
  // type's default view (the editor's preset isn't bound to a specific region).
  function renderPreview() {
    const lvl = selectedLevel();
    previewLabelEl.textContent = lvl.name;
    const mapEl = $("[data-mm-preview-map]");
    if (mapEl && window.MinimapRender && window.GeoRegions) {
      MinimapRender.render(mapEl, lvl, GeoRegions.level(lvl.type));
    }
  }

  // --- Advanced / custom style state ---
  function renderCustomState(lvl) {
    const empty = $("[data-mm-custom-empty]");
    const set = $("[data-mm-custom-set]");
    const nameOut = $("[data-mm-custom-name]");
    if (lvl.customStyle) {
      empty.hidden = true;
      set.hidden = false;
      nameOut.textContent = lvl.customStyle.filename;
    } else {
      empty.hidden = false;
      set.hidden = true;
    }
  }

  function renderAll() {
    renderRail();
    renderSettings();
    renderPreview();
  }

  // --- Events: select a level (delegated on the rail) ---
  levelsEl.addEventListener("click", (e) => {
    if (e.target.closest("[data-level-menu]")) return; // handled in Task 6
    const row = e.target.closest(".mm-level");
    if (!row) return;
    selectedId = row.dataset.levelId;
    renderAll();
  });

  // Expose for later tasks (persistence, rail menu, add-level, custom file).
  window.__mmEditor = {
    getPreset: () => preset,
    setPreset: (p) => {
      preset = p;
      selectedId = (p.levels[0] || {}).id;
      renderAll();
    },
    getSelectedId: () => selectedId,
    setSelectedId: (id) => {
      selectedId = id;
    },
    renderAll,
    renderSettings,
    renderCustomState,
    selectedLevel,
  };

  // --- Per-level overflow menu ---
  // Simple prompt-based rename keeps the prototype lean; rename/default
  // mutate state and re-render. The level set is fixed (Globe + Region).
  levelsEl.addEventListener("click", async (e) => {
    const menuBtn = e.target.closest("[data-level-menu]");
    if (!menuBtn) return;
    e.stopPropagation();
    const row = menuBtn.closest(".mm-level");
    const id = row.dataset.levelId;
    const lvl = preset.levels.find((l) => l.id === id);
    const action = await levelMenu(menuBtn);
    if (!action || !lvl) return;

    if (action === "rename") {
      const next = window.prompt("Rename level", lvl.name);
      if (next && next.trim()) {
        lvl.name = next.trim();
        renderAll();
      }
    } else if (action === "default") {
      preset.defaultLevelId = id;
      renderAll();
    }
  });

  // Lightweight popover menu anchored to the ⋯ button. Resolves an action string.
  function levelMenu(anchor) {
    return new Promise((resolve) => {
      const menu = document.createElement("div");
      menu.className = "filter-popover";
      menu.setAttribute("role", "menu");
      menu.innerHTML =
        '<button type="button" class="sort-option" role="menuitem" data-a="rename">Rename</button>' +
        '<button type="button" class="sort-option" role="menuitem" data-a="default">Set as default</button>';
      const r = anchor.getBoundingClientRect();
      menu.style.position = "fixed";
      menu.style.top = Math.round(r.bottom + 4) + "px";
      menu.style.left = Math.round(r.right - 160) + "px";
      menu.style.minWidth = "160px";
      document.body.appendChild(menu);
      function cleanup(val) {
        menu.remove();
        document.removeEventListener("click", onDoc, true);
        resolve(val);
      }
      function onDoc(ev) {
        const opt = ev.target.closest("[data-a]");
        if (opt && menu.contains(opt)) {
          ev.preventDefault();
          cleanup(opt.dataset.a);
          return;
        }
        if (!menu.contains(ev.target)) cleanup(null);
      }
      setTimeout(() => document.addEventListener("click", onDoc, true), 0);
    });
  }

  // --- Advanced: custom style file (records filename only; no parsing) ---
  const fileInput = document.querySelector("[data-mm-custom-file]");
  const clearBtn = document.querySelector("[data-mm-custom-clear]");
  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    selectedLevel().customStyle = { filename: file.name };
    fileInput.value = "";
    renderSettings(); // re-render fields disabled + custom note
  });
  clearBtn.addEventListener("click", () => {
    selectedLevel().customStyle = null;
    renderSettings();
  });

  // --- Persistence: snapshot the whole minimap library in the "minimap" bucket ---
  // Each saved entry carries card fields (id/name/created/thumb) plus the rich
  // level data (defaultLevelId/levels). Mirrors the preset editor's approach.
  // The controller owns persistence outright: the page's old inline persistSave()
  // and its save-button handlers were removed in an earlier task.
  //
  // Name source: the save modal's #save-template-name input is the source of
  // truth on save (openModal prefills it from the editor title). Fall back to
  // the title, then "Untitled".
  function currentName() {
    const input = document.getElementById("save-template-name");
    if (input && input.value.trim()) return input.value.trim();
    const t = document.querySelector("[data-editor-title]");
    return (t && t.textContent.trim()) || "Untitled";
  }

  // A tiny inline-SVG data URI thumbnail of the default level (land over bg).
  function makeThumb() {
    const def = preset.levels.find((l) => l.id === preset.defaultLevelId) || preset.levels[0];
    const s = def.settings;
    const bg = s.background || "#fff";
    const land = def.schema === "physical" ? s.water : s.land;
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>" +
      "<rect width='80' height='80' fill='" + bg + "'/>" +
      "<circle cx='40' cy='40' r='26' fill='" + (land || "#ddd") + "'/></svg>";
    // Wrap as a CSS url() so library-saved.js can drop it straight into
    // `background-image:${thumb}` (matching the basemap `url("…")` form).
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
  }

  // Local-date stamp (matches SavedMaps' local todayISO, avoids UTC day-skew).
  function todayLocalISO() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function serialize() {
    if (!window.SavedMaps) return;
    preset.name = currentName();
    preset.thumb = makeThumb();
    const list = SavedMaps.list("minimap").filter((e) => e.id !== preset.id);
    if (!preset.createdStamped) {
      preset.created = todayLocalISO();
      preset.createdStamped = true;
    }
    // Don't leak the transient createdStamped flag into storage.
    const snapshot = JSON.parse(JSON.stringify(preset));
    delete snapshot.createdStamped;
    list.push(snapshot);
    SavedMaps.replaceAll("minimap", list);
  }

  function hydrate() {
    if (!window.SavedMaps) return;
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    if (!id) return;
    const found = SavedMaps.list("minimap").find((e) => e.id === id);
    if (!found || !found.levels) return;
    preset = JSON.parse(JSON.stringify(found));
    preset.createdStamped = true;
    selectedId = (preset.levels[0] || {}).id;
    const titleEl = document.querySelector("[data-editor-title]");
    if (titleEl && preset.name) titleEl.textContent = preset.name;
    renderAll();
  }

  // Both modal commit buttons persist; reflect the saved name onto the editor
  // title, and fire the shared toast on the in-page Save (save-confirm).
  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-action="save-confirm"], [data-action="save-and-go"]')) {
      serialize();
      const titleEl = document.querySelector("[data-editor-title]");
      if (titleEl) titleEl.textContent = preset.name;
      if (e.target.closest('[data-action="save-confirm"]') && window.__mmShowToast) {
        window.__mmShowToast();
      }
    }
  });

  hydrate();

  renderAll();
})();
