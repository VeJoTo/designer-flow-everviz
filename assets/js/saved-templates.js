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
      // Bring it into view and let the highlight fade after a moment.
      requestAnimationFrame(() => card.scrollIntoView({ behavior: "smooth", block: "center" }));
      setTimeout(() => card.classList.remove("template-card--new"), 6000);
    }
  }
});
