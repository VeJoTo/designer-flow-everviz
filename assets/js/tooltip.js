// Attaches hover/click tooltips to any element with [data-tooltip="…"].
// Re-runnable: exposes window.__protoInitTooltips() so chrome.js can re-init
// after injecting the chrome partial.

(function () {
  let tooltipEl;
  let hideTimer;

  function ensureNode() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement("div");
    tooltipEl.className = "proto-tooltip";
    tooltipEl.setAttribute("role", "tooltip");
    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  function show(target) {
    const text = target.getAttribute("data-tooltip");
    if (!text) return;
    const node = ensureNode();
    node.textContent = text;
    const rect = target.getBoundingClientRect();

    // Placement: explicit data-tooltip-placement wins; otherwise sidebar
    // icons get right-placement (they hug the left edge — a centered
    // tooltip below would overflow off-screen), everything else gets
    // the default bottom-placement.
    const explicit = target.getAttribute("data-tooltip-placement");
    const placement = explicit || (target.closest(".sidebar") ? "right" : "bottom");
    node.classList.toggle("proto-tooltip--right", placement === "right");

    if (placement === "right") {
      node.style.left = `${Math.round(rect.right + 10)}px`;
      node.style.top  = `${Math.round(rect.top + rect.height / 2)}px`;
      node.style.transform = "translate(0, -50%)";
    } else {
      node.style.left = `${Math.round(rect.left + rect.width / 2)}px`;
      node.style.top  = `${Math.round(rect.bottom + 10)}px`;
      node.style.transform = "translate(-50%, 0)";
    }

    requestAnimationFrame(() => node.classList.add("is-visible"));
    clearTimeout(hideTimer);
  }

  function hide() {
    if (!tooltipEl) return;
    tooltipEl.classList.remove("is-visible");
  }

  function bind(target) {
    if (target.__protoTooltipBound) return;
    target.__protoTooltipBound = true;
    target.addEventListener("mouseenter", () => show(target));
    target.addEventListener("mouseleave", hide);
    target.addEventListener("focus", () => show(target));
    target.addEventListener("blur", hide);
    target.addEventListener("click", (e) => {
      // Only swallow the click for non-navigating targets (icon buttons,
      // placeholder `href="#"` links). Real links — e.g. the brand logo and
      // the Designer-tools nav item, which carry a tooltip too — must be
      // allowed to navigate. (#165)
      const href = target.getAttribute("href");
      const navigates =
        target.tagName === "A" && href && href.charAt(0) !== "#";
      if (!navigates) e.preventDefault();
      show(target);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, 1500);
    });
  }

  function init() {
    document.querySelectorAll("[data-tooltip]").forEach(bind);
  }

  window.__protoInitTooltips = init;
  document.addEventListener("DOMContentLoaded", init);
})();
