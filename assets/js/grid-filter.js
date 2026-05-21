// Generic client-side grid filter.
//
// Activates any element with [data-filter-root] and filters the
// descendant [data-filter-grid] in place using these controls (all
// optional, attached anywhere inside the root):
//
//   [data-filter-search]                   text input — substring match on item name
//   [data-filter-tag-trigger]              button that opens the tag popover
//   [data-filter-tag-popover]              popover with .tag-option[data-value] elements
//   [data-filter-sort-trigger]             button that opens the sort popover
//   [data-filter-sort-popover]             popover with .sort-option[data-value] elements
//   [data-filter-empty]                    element shown when no results
//   [data-filter-clear]                    button that clears all filters
//   [data-filter-chips]                    container where active-tag chips render
//
// Each [data-filter-item] inside the grid should set:
//   data-name="..."   — text matched by search and used for name sort
//   data-tags="a,b"   — comma-separated tags; whitespace tolerated

(function () {
  function init(root) {
    const grid = root.querySelector("[data-filter-grid]");
    if (!grid) return;
    const items = Array.from(grid.querySelectorAll("[data-filter-item]"));
    if (!items.length) return;

    const state = {
      search: "",
      tags: new Set(),
      sort: "recent", // "recent" | "name-asc" | "name-desc"
    };

    const search = root.querySelector("[data-filter-search]");
    const tagTrigger = root.querySelector("[data-filter-tag-trigger]");
    const tagPopover = root.querySelector("[data-filter-tag-popover]");
    const sortTrigger = root.querySelector("[data-filter-sort-trigger]");
    const sortPopover = root.querySelector("[data-filter-sort-popover]");
    const empty = root.querySelector("[data-filter-empty]");
    const clear = root.querySelector("[data-filter-clear]");
    const chips = root.querySelector("[data-filter-chips]");

    const SORT_LABELS = {
      recent: "Most recent",
      "name-asc": "Name (A–Z)",
      "name-desc": "Name (Z–A)",
    };
    const initialOrder = items.map((el, i) => [el, i]);

    function itemTags(item) {
      return (item.dataset.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    function matches(item) {
      const name = (item.dataset.name || "").toLowerCase();
      if (state.search && !name.includes(state.search)) return false;
      if (state.tags.size) {
        const tags = new Set(itemTags(item));
        for (const t of state.tags) if (!tags.has(t)) return false;
      }
      return true;
    }
    function compare(a, b) {
      if (state.sort === "name-asc") {
        return (a.dataset.name || "").localeCompare(b.dataset.name || "");
      }
      if (state.sort === "name-desc") {
        return (b.dataset.name || "").localeCompare(a.dataset.name || "");
      }
      // Most recent: prefer data-created (newer first), fall back to DOM order.
      const da = a.dataset.created;
      const db = b.dataset.created;
      if (da && db && da !== db) return da < db ? 1 : -1;
      if (da && !db) return -1;
      if (!da && db) return 1;
      const ia = initialOrder.find(([el]) => el === a)?.[1] ?? 0;
      const ib = initialOrder.find(([el]) => el === b)?.[1] ?? 0;
      return ia - ib;
    }
    function render() {
      const ordered = [...items].sort(compare);
      let visible = 0;
      for (const item of ordered) {
        if (matches(item)) {
          item.hidden = false;
          visible++;
        } else {
          item.hidden = true;
        }
        grid.appendChild(item); // re-order in DOM
      }
      if (empty) empty.hidden = visible !== 0;
      if (sortTrigger) {
        const v = sortTrigger.querySelector("[data-filter-sort-label]");
        if (v) v.textContent = SORT_LABELS[state.sort];
      }
      if (tagTrigger) {
        const v = tagTrigger.querySelector("[data-filter-tag-label]");
        if (v) {
          v.textContent =
            state.tags.size === 0
              ? "Select tags"
              : `${state.tags.size} tag${state.tags.size === 1 ? "" : "s"}`;
          v.classList.toggle(
            "select__value--placeholder",
            state.tags.size === 0
          );
        }
      }
      if (chips) {
        chips.innerHTML = "";
        for (const t of state.tags) {
          const chip = document.createElement("button");
          chip.className = "filter-chip";
          chip.type = "button";
          chip.innerHTML = `<span>${t}</span><span class="filter-chip__x" aria-hidden="true">×</span>`;
          chip.setAttribute("aria-label", `Remove tag ${t}`);
          chip.addEventListener("click", () => {
            state.tags.delete(t);
            syncTagOptions();
            render();
          });
          chips.appendChild(chip);
        }
        const anyFilterActive =
          state.search !== "" ||
          state.tags.size > 0 ||
          state.sort !== "recent";
        if (anyFilterActive) {
          const clearAll = document.createElement("button");
          clearAll.className = "filter-chip filter-chip--clear";
          clearAll.type = "button";
          clearAll.textContent = "Clear all";
          clearAll.addEventListener("click", () => clearFilters());
          chips.appendChild(clearAll);
        }
        chips.hidden = !anyFilterActive;
      }
    }

    function clearFilters() {
      state.search = "";
      state.tags.clear();
      state.sort = "recent";
      if (search) search.value = "";
      syncTagOptions();
      sortPopover?.querySelectorAll(".sort-option").forEach((o) => {
        o.classList.toggle("is-selected", o.dataset.value === "recent");
      });
      render();
    }

    // Search
    if (search) {
      search.addEventListener("input", () => {
        state.search = search.value.toLowerCase().trim();
        render();
      });
    }

    // Tag popover
    function syncTagOptions() {
      if (!tagPopover) return;
      tagPopover.querySelectorAll(".tag-option").forEach((opt) => {
        const v = opt.dataset.value;
        opt.classList.toggle("is-selected", state.tags.has(v));
        opt.setAttribute(
          "aria-checked",
          state.tags.has(v) ? "true" : "false"
        );
      });
    }
    if (tagTrigger && tagPopover) {
      const positionTagPopover = () => {
        const r = tagTrigger.getBoundingClientRect();
        tagPopover.style.top = `${r.bottom + 6}px`;
        tagPopover.style.left = `${r.left}px`;
        tagPopover.style.minWidth = `${r.width}px`;
      };
      const openTags = () => {
        positionTagPopover();
        tagPopover.hidden = false;
      };
      const closeTags = () => {
        tagPopover.hidden = true;
      };
      tagTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        tagPopover.hidden ? openTags() : closeTags();
      });
      tagPopover.addEventListener("click", (e) => {
        const opt = e.target.closest(".tag-option");
        if (!opt) return;
        const v = opt.dataset.value;
        if (state.tags.has(v)) state.tags.delete(v);
        else state.tags.add(v);
        syncTagOptions();
        render();
      });
      document.addEventListener("click", (e) => {
        if (tagPopover.hidden) return;
        if (tagTrigger.contains(e.target) || tagPopover.contains(e.target)) return;
        closeTags();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !tagPopover.hidden) closeTags();
      });
    }

    // Sort popover
    if (sortTrigger && sortPopover) {
      const positionSortPopover = () => {
        const r = sortTrigger.getBoundingClientRect();
        sortPopover.style.top = `${r.bottom + 6}px`;
        sortPopover.style.left = `${r.left}px`;
        sortPopover.style.minWidth = `${r.width}px`;
      };
      const openSort = () => {
        positionSortPopover();
        sortPopover.hidden = false;
      };
      const closeSort = () => {
        sortPopover.hidden = true;
      };
      sortTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        sortPopover.hidden ? openSort() : closeSort();
      });
      sortPopover.addEventListener("click", (e) => {
        const opt = e.target.closest(".sort-option");
        if (!opt) return;
        state.sort = opt.dataset.value || "recent";
        sortPopover.querySelectorAll(".sort-option").forEach((o) => {
          o.classList.toggle("is-selected", o === opt);
        });
        closeSort();
        render();
      });
      document.addEventListener("click", (e) => {
        if (sortPopover.hidden) return;
        if (sortTrigger.contains(e.target) || sortPopover.contains(e.target)) return;
        closeSort();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !sortPopover.hidden) closeSort();
      });
    }

    // Clear all (empty-state button)
    if (clear) clear.addEventListener("click", clearFilters);

    syncTagOptions();
    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-filter-root]").forEach(init);
  });
})();
