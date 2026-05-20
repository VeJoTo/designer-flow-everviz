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
    const left = rect.left + rect.width / 2;
    const top = rect.bottom + 14;
    node.style.left = `${Math.round(left)}px`;
    node.style.top = `${Math.round(top)}px`;
    node.style.transform = `translate(-50%, 0)`;
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
      e.preventDefault();
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
