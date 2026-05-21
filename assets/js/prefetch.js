// Prefetch same-origin destination pages on link hover so subsequent
// navigations are instant. Inspired by instant.page. Cancels if the
// user moves the mouse away before the dwell time elapses.

(function () {
  const DWELL_MS = 65;
  const prefetched = new Set();
  let pendingTimer;

  function shouldPrefetch(href) {
    if (!href || prefetched.has(href)) return false;
    let url;
    try { url = new URL(href, window.location.href); } catch { return false; }
    if (url.origin !== window.location.origin) return false;
    if (url.pathname === window.location.pathname) return false;
    if (url.hash && url.pathname === window.location.pathname) return false;
    return true;
  }

  function prefetch(href) {
    if (!shouldPrefetch(href)) return;
    prefetched.add(href);
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = href;
    link.as = "document";
    document.head.appendChild(link);
  }

  document.addEventListener("mouseover", (e) => {
    const a = e.target.closest("a[href]");
    if (!a) return;
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => prefetch(a.href), DWELL_MS);
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest("a[href]")) clearTimeout(pendingTimer);
  });
  // Touch users — prefetch immediately on touchstart.
  document.addEventListener("touchstart", (e) => {
    const a = e.target.closest("a[href]");
    if (a) prefetch(a.href);
  }, { passive: true });
})();
