// On the Map designer page: render templates the user saved from the
// wizard (SavedMaps "template" bucket) as cards at the top of the
// Templates grid, and highlight the one just created (flagged in
// sessionStorage by the wizard's Save action).
//
// Must load BEFORE grid-filter.js so saved templates participate in
// search / sort / tag filtering, and before favorites.js / dates.js so
// their star + date render on first paint.

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector('[data-filter-root][data-fav-kind="template"]');
  if (!root || !window.SavedMaps) return;
  const grid = root.querySelector("[data-filter-grid]");
  if (!grid) return;

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
    li.className = "template-card template-card--saved";
    li.setAttribute("data-filter-item", "");
    li.setAttribute("data-name", entry.name);
    li.setAttribute("data-tags", "Custom");
    li.setAttribute("data-created", entry.created);
    li.setAttribute("data-saved-id", entry.id);
    const thumb = entry.thumb || 'url("assets/img/maps/north-europe.png")';
    const url = `pages/template-creator.html?id=${encodeURIComponent(
      entry.id
    )}&name=${encodeURIComponent(entry.name)}`;
    li.innerHTML = `
      <a class="template-card__hit" href="${url}" aria-label="Open ${escapeHTML(entry.name)} template">
        <div class="template-card__thumb" style="background-image:${thumb.replace(/"/g, "&quot;")}" aria-hidden="true"></div>
      </a>
      <div class="template-card__body">
        <h3 class="template-card__title">${escapeHTML(entry.name)}</h3>
        <span class="card-date" data-date-slot></span>
        <a class="template-card__default">Set as default location map template</a>
        <div class="template-card__actions">
          <a class="icon-btn" href="${url}" aria-label="Edit" data-tooltip="Edit"><img src="assets/icons/pencil.svg" alt="" width="16" height="16" /></a>
          <button class="icon-btn" aria-label="Settings" data-tooltip="Settings"><img src="assets/icons/cog-6-tooth.svg" alt="" width="16" height="16" /></button>
          <button class="icon-btn" aria-label="Duplicate" data-tooltip="Duplicate"><img src="assets/icons/document-duplicate.svg" alt="" width="16" height="16" /></button>
          <button class="icon-btn icon-btn--toggle" aria-label="Favorite" data-tooltip="Favorite"><img src="assets/icons/star.svg" alt="" width="16" height="16" /></button>
        </div>
      </div>
    `;
    return li;
  }

  // Newest-first: list() returns newest-first, so iterate in reverse and
  // prepend, leaving the newest entry at the very top of the grid.
  const list = window.SavedMaps.list("template");
  for (let i = list.length - 1; i >= 0; i--) grid.prepend(renderEntry(list[i]));

  // Highlight the template the wizard just saved.
  let newId = null;
  try {
    newId = sessionStorage.getItem("everviz-new-template");
    sessionStorage.removeItem("everviz-new-template");
  } catch (e) {}
  if (newId) {
    const card = grid.querySelector(`[data-saved-id="${CSS.escape(newId)}"]`);
    if (card) {
      card.classList.add("template-card--new");
      const badge = document.createElement("span");
      badge.className = "template-card__new-badge";
      badge.textContent = "New";
      card.prepend(badge);
      // Scroll down to the Templates section so the user lands looking at
      // their freshly-saved template (it sits at the top of the grid).
      requestAnimationFrame(() => {
        (root || card).scrollIntoView({ behavior: "smooth", block: "start" });
      });
      setTimeout(() => card.classList.remove("template-card--new"), 6000);
    }
  }

  // ── Edit any template in the wizard, pre-filled with its name (and id
  //    for saved ones), and give every card a delete button. ───────────
  grid.querySelectorAll(".template-card").forEach((card) => {
    const name =
      card.dataset.name || card.querySelector(".template-card__title")?.textContent.trim() || "";
    const id = card.dataset.savedId;
    const url =
      "pages/template-creator.html?" +
      (id ? `id=${encodeURIComponent(id)}&` : "") +
      `name=${encodeURIComponent(name)}`;
    card
      .querySelectorAll('.template-card__hit, .icon-btn[aria-label="Edit"]')
      .forEach((a) => a.setAttribute("href", url));
    const actions = card.querySelector(".template-card__actions");
    if (actions && !actions.querySelector("[data-template-delete]")) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "icon-btn icon-btn--danger";
      del.setAttribute("aria-label", "Delete");
      del.setAttribute("data-tooltip", "Delete");
      del.setAttribute("data-template-delete", "");
      del.innerHTML = '<img src="assets/icons/trash.svg" alt="" width="16" height="16" />';
      actions.appendChild(del);
    }
  });

  // Delete a template, with a confirmation. Saved templates also clear from
  // localStorage; static demo cards just disappear from the DOM.
  grid.addEventListener("click", async (e) => {
    const del = e.target.closest("[data-template-delete]");
    if (!del) return;
    e.preventDefault();
    const card = del.closest(".template-card");
    const name =
      card?.dataset.name ||
      card?.querySelector(".template-card__title")?.textContent.trim() ||
      "this template";
    const ok = await window.confirmDialog?.({
      title: "Delete template",
      message: `Are you sure you want to delete <strong>${escapeHTML(name)}</strong>?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const id = card.dataset.savedId;
    if (id && window.SavedMaps) window.SavedMaps.delete("template", id);
    card.remove();
  });

  // Duplicate a template — clones any card as "<name> copy" and inserts it
  // after the original. Saved cards also get a new SavedMaps entry so the
  // copy survives a reload; static demo cards clone in the DOM only (mirrors
  // how the delete handler treats them, and the library duplicate in
  // library-saved.js).
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
    const li = btn.closest(".template-card");
    if (!li) return;

    const baseName =
      li.dataset.name || li.querySelector(".template-card__title")?.textContent.trim() || "Template";
    const newName = `${baseName} copy`;
    const clone = li.cloneNode(true);
    clone.dataset.name = newName;
    clone.dataset.created = todayISO(); // fresh copy → newest
    const titleEl = clone.querySelector(".template-card__title");
    if (titleEl) titleEl.textContent = newName;
    clone.querySelectorAll('[aria-label^="Open "]').forEach((a) =>
      a.setAttribute("aria-label", `Open ${newName} template`)
    );
    const dateSlot = clone.querySelector("[data-date-slot]");
    if (dateSlot) dateSlot.textContent = "Today";
    // A fresh copy starts unfavorited and is not the default template.
    clone.classList.remove("is-favorited");
    const star = clone.querySelector(".icon-btn--toggle img");
    if (star) star.src = "assets/icons/star.svg";
    clone.classList.remove("is-default");
    const defaultLink = clone.querySelector(".template-card__default");
    if (defaultLink) defaultLink.textContent = "Set as default location map template";
    // Drop the wizard's "new" highlight if it happened to be on the source.
    clone.classList.remove("template-card--new");
    clone.querySelector(".template-card__new-badge")?.remove();

    if (li.dataset.savedId && window.SavedMaps) {
      const thumb = clone.querySelector(".template-card__thumb")?.style.backgroundImage || "";
      const entry = window.SavedMaps.save("template", { name: newName, thumb });
      clone.dataset.savedId = entry.id;
      const url = `pages/template-creator.html?id=${encodeURIComponent(
        entry.id
      )}&name=${encodeURIComponent(newName)}`;
      clone
        .querySelectorAll('.template-card__hit, .icon-btn[aria-label="Edit"]')
        .forEach((a) => a.setAttribute("href", url));
    } else {
      // Static demo card → not persisted, so it must not look saved.
      delete clone.dataset.savedId;
    }

    li.after(clone);
    // Re-run the grid filter/sort so the copy is indexed and surfaced.
    clone.dispatchEvent(new CustomEvent("favorite-changed", { bubbles: true }));
  });
});
