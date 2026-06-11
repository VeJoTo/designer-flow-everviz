// Promise-based confirm dialog. Reuses the save-modal aesthetic
// (navy header, X close, body, outline-cancel + filled-confirm
// footer). Two shapes:
//
//   Binary (default) — resolves a boolean:
//   const ok = await window.confirmDialog({
//     title: "Delete map",
//     message: "Are you sure you want to delete <strong>X</strong>?",
//     confirmLabel: "Delete",
//     destructive: true,
//   });
//   if (ok) { ...do the thing... }
//
//   Three-way — pass discardLabel to get a middle "Discard" button.
//   Resolves "confirm" | "discard" | "cancel" instead of a boolean:
//   const choice = await window.confirmDialog({
//     title: "Unsaved changes",
//     message: "Save changes to this preset?",
//     confirmLabel: "Save",
//     discardLabel: "Discard",
//     destructive: false,
//   });

(function () {
  let modal = null;

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "confirm-modal";
    modal.dataset.confirmModal = "";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="confirm-modal__backdrop" data-confirm-close></div>
      <div class="confirm-modal__panel" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <header class="confirm-modal__head">
          <h2 class="confirm-modal__title" id="confirm-modal-title">Confirm</h2>
          <button class="confirm-modal__close" aria-label="Close" data-confirm-close>
            <img src="assets/icons/x-mark.svg" alt="" width="18" height="18" />
          </button>
        </header>
        <div class="confirm-modal__body" data-confirm-body></div>
        <footer class="confirm-modal__foot">
          <button class="btn btn--discard" data-confirm-discard hidden>Discard</button>
          <button class="btn btn--outline" data-confirm-cancel>Cancel</button>
          <button class="btn btn--danger" data-confirm-ok>Delete</button>
        </footer>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  function confirmDialog({
    title = "Confirm",
    message = "",
    confirmLabel = "Delete",
    discardLabel = null,
    destructive = true,
  } = {}) {
    const m = ensureModal();
    m.querySelector(".confirm-modal__title").textContent = title;
    m.querySelector("[data-confirm-body]").innerHTML = message;
    const okBtn = m.querySelector("[data-confirm-ok]");
    okBtn.textContent = confirmLabel;
    okBtn.classList.toggle("btn--danger", destructive);
    okBtn.classList.toggle("btn--primary", !destructive);

    // Three-way mode: showing the Discard button switches the resolved
    // value from a boolean to a "confirm" | "discard" | "cancel" string.
    const discardBtn = m.querySelector("[data-confirm-discard]");
    const threeWay = discardLabel != null;
    discardBtn.hidden = !threeWay;
    if (threeWay) discardBtn.textContent = discardLabel;

    return new Promise((resolve) => {
      function cleanup(result) {
        m.hidden = true;
        document.body.style.overflow = "";
        m.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKey);
        resolve(result);
      }
      function onClick(e) {
        if (
          e.target.closest("[data-confirm-cancel]") ||
          e.target.closest("[data-confirm-close]")
        ) {
          cleanup(threeWay ? "cancel" : false);
        } else if (e.target.closest("[data-confirm-discard]")) {
          cleanup("discard");
        } else if (e.target.closest("[data-confirm-ok]")) {
          cleanup(threeWay ? "confirm" : true);
        }
      }
      function onKey(e) {
        if (e.key === "Escape") cleanup(threeWay ? "cancel" : false);
        if (e.key === "Enter") cleanup(threeWay ? "confirm" : true);
      }
      m.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
      m.hidden = false;
      document.body.style.overflow = "hidden";
      // Focus the safe default: Cancel for a destructive confirm, the
      // primary action (e.g. Save) when nothing is being destroyed.
      const focusTarget = destructive
        ? m.querySelector("[data-confirm-cancel]")
        : okBtn;
      focusTarget.focus();
    });
  }

  window.confirmDialog = confirmDialog;
})();
