// On library pages: render any SavedMaps entries as cards at the top
// of the grid. Wires a delete handler that removes from localStorage
// and the DOM. Must load BEFORE grid-filter.js so saved entries
// participate in search/sort/tag filtering.

document.addEventListener("DOMContentLoaded", () => {
  const kind = document.body.dataset.libraryKind; // "minimap" | "basemap"
  if (!kind || !window.SavedMaps) return;
  const grid = document.querySelector("[data-filter-grid]");
  if (!grid) return;

  const editorHref =
    kind === "minimap" ? "pages/minimap-editor.html" : "pages/base-map-editor.html";
  const defaultLabel = kind === "minimap" ? "mini-map" : "base-map";

  function escapeHTML(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderEntry(entry) {
    const li = document.createElement("li");
    li.className = "map-card map-card--saved";
    li.setAttribute("data-filter-item", "");
    li.setAttribute("data-name", entry.name);
    li.setAttribute("data-tags", "Custom");
    li.setAttribute("data-created", entry.created);
    li.setAttribute("data-saved-id", entry.id);
    const thumb = entry.thumb || 'url("assets/img/maps/world.png")';
    const url =
      `${editorHref}?id=${encodeURIComponent(entry.id)}&name=${encodeURIComponent(
        entry.name
      )}`;
    const levelCount = Array.isArray(entry.levels) ? entry.levels.length : 0;
    const levelBadge =
      kind === "minimap" && levelCount
        ? `<span class="map-card__badge">${levelCount} ${levelCount === 1 ? "level" : "levels"}</span>`
        : "";
    li.innerHTML = `
      <a class="map-card__hit" href="${url}" aria-label="Open ${escapeHTML(entry.name)}">
        <div class="map-card__thumb" style="background-image:${thumb.replace(/"/g, '&quot;')}" aria-hidden="true"></div>
        ${levelBadge}
      </a>
      <div class="map-card__body">
        <h3 class="map-card__title">${escapeHTML(entry.name)}</h3>
        <span class="card-date" data-date-slot></span>
        <a class="map-card__default">Set as default ${defaultLabel}</a>
        <div class="map-card__actions">
          <div class="map-card__actions-group">
            <button class="icon-btn" aria-label="Duplicate" data-tooltip="Duplicate"><img src="assets/icons/document-duplicate.svg" alt="" width="16" height="16" /></button>
            <a class="icon-btn" href="${url}" aria-label="Edit" data-tooltip="Edit"><img src="assets/icons/pencil.svg" alt="" width="16" height="16" /></a>
            <button class="icon-btn icon-btn--toggle" aria-label="Favorite" data-tooltip="Favorite"><img src="assets/icons/star.svg" alt="" width="16" height="16" /></button>
          </div>
          <button class="icon-btn icon-btn--danger" aria-label="Delete" data-saved-delete data-tooltip="Delete"><img src="assets/icons/trash.svg" alt="" width="16" height="16" /></button>
        </div>
      </div>
    `;
    return li;
  }

  // Insert saved entries at the top, oldest-first (so unshift preserves
  // newest-first order in the final DOM).
  const list = window.SavedMaps.list(kind);
  for (const entry of list) grid.prepend(renderEntry(entry));

  // Delete handler — works on any map-card. Saved cards (with
  // [data-saved-delete] / data-saved-id) also clear localStorage.
  // Static cards just disappear from the DOM.
  grid.addEventListener("click", async (e) => {
    const btn = e.target.closest('.icon-btn--danger, [data-saved-delete]');
    if (!btn) return;
    e.preventDefault();
    const li = btn.closest(".map-card");
    if (!li) return;
    const name = li.querySelector(".map-card__title")?.textContent?.trim() || "this map";
    const title = kind === "minimap" ? "Delete minimap" : "Delete basemap";
    const ok = await window.confirmDialog?.({
      title,
      message: `Are you sure you want to delete <strong>${escapeHTML(name)}</strong>?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const id = li.dataset.savedId;
    if (id && window.SavedMaps) window.SavedMaps.delete(kind, id);
    li.remove();
  });

  // Duplicate handler — clones any map-card as "<name> copy" and inserts
  // it. Saved cards also get a new SavedMaps entry so the copy survives a
  // reload; static demo cards clone in the DOM only (mirrors how the
  // delete handler treats them).
  function todayISO() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest('.icon-btn[aria-label="Duplicate"]');
    if (!btn) return;
    e.preventDefault();
    const li = btn.closest(".map-card");
    if (!li) return;

    const baseName =
      li.dataset.name || li.querySelector(".map-card__title")?.textContent?.trim() || "Map";
    const newName = `${baseName} copy`;
    const clone = li.cloneNode(true);
    clone.dataset.name = newName;
    clone.dataset.created = todayISO(); // fresh copy → newest
    const titleEl = clone.querySelector(".map-card__title");
    if (titleEl) titleEl.textContent = newName;
    clone.querySelectorAll('[aria-label^="Open "]').forEach((a) =>
      a.setAttribute("aria-label", `Open ${newName}`)
    );
    const dateSlot = clone.querySelector("[data-date-slot]");
    if (dateSlot) dateSlot.textContent = "Today";
    // A fresh copy starts unfavorited (favorites are keyed by name / id).
    clone.classList.remove("is-favorited");
    const star = clone.querySelector(".icon-btn--toggle img");
    if (star) star.src = "assets/icons/star.svg";

    if (li.dataset.savedId && window.SavedMaps) {
      const thumb = clone.querySelector(".map-card__thumb")?.style.backgroundImage || "";
      const entry = window.SavedMaps.save(kind, { name: newName, thumb });
      clone.dataset.savedId = entry.id;
      const url = `${editorHref}?id=${encodeURIComponent(entry.id)}&name=${encodeURIComponent(
        newName
      )}`;
      clone
        .querySelectorAll(".map-card__hit, .icon-btn[aria-label='Edit']")
        .forEach((a) => a.setAttribute("href", url));
    }

    li.after(clone);
    // Re-run the grid filter/sort so the copy is indexed and surfaced.
    clone.dispatchEvent(new CustomEvent("favorite-changed", { bubbles: true }));
  });
});
