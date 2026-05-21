// Renders relative-or-absolute "created" dates onto any
// [data-created] element that has a [data-date-slot] child.
//
// Rules:
//   Today, Yesterday
//   2-6 days  → "N days ago"
//   7-13 days → "Last week"
//   14-29 days → "N weeks ago"
//   30 days+ → absolute, e.g. "May 15, 2026"

(function () {
  const MS_DAY = 86400000;

  function formatRelative(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    const now = new Date();
    // Normalise to local midnight on both sides so day diff is integer.
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const created = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const days = Math.round((today - created) / MS_DAY);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 14) return "Last week";
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-created]").forEach((el) => {
      const slot = el.querySelector("[data-date-slot]");
      if (!slot) return;
      slot.textContent = formatRelative(el.dataset.created);
    });
  });
})();
