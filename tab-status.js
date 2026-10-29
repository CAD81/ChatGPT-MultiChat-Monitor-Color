(() => {
  "use strict";
  if (globalThis.__chatgptMultiChatColorStatus) return;

  const ICON_ID = "chatgpt-multichat-monitor-color-favicon";
  const ICON_DIR = "assets/tab-status/";
  const STATES = new Set([
    "working", "finished", "attention", "error", "retry",
    "interrupted", "draft", "pending", "idle"
  ]);
  let lastState = null;
  let updateRevision = 0;
  let forcedUpdates = 0;
  let lastAppliedAt = 0;

  function apply(state, options = {}) {
    try {
      if (!globalThis.document?.head || !globalThis.chrome?.runtime?.getURL) return false;
      const normalized = STATES.has(state) ? state : "idle";
      const head = document.head;
      const current = document.getElementById(ICON_ID);
      const fresh = !current || current.tagName !== "LINK" ||
        normalized !== lastState || options.force === true;

      if (fresh) {
        // Use a new URL on each *actual state change* and each bounded repair.
        // Chromium/Vivaldi otherwise sometimes keeps the old cached favicon
        // even when the page <link rel="icon"> already points to the new SVG.
        updateRevision += 1;
        const nonce = Date.now().toString(36) + "-" + updateRevision.toString(36);
        const iconUrl = chrome.runtime.getURL(ICON_DIR + normalized + ".svg") +
          "?gptmm=" + nonce;
        const next = document.createElement("link");
        next.id = ICON_ID;
        next.rel = "icon";
        next.type = "image/svg+xml";
        next.sizes = "any";
        next.setAttribute("href", iconUrl);
        head.appendChild(next);
        if (current && current !== next) current.remove();
        if (options.force === true) forcedUpdates += 1;
        lastState = normalized;
        lastAppliedAt = Date.now();
        return true;
      }

      // Preserve extension priority when ChatGPT inserts another site favicon;
      // do not repeatedly mutate the head on normal evaluation.
      const icons = document.querySelectorAll('link[rel~="icon"]');
      if (current.parentNode !== head ||
          (icons.length && icons[icons.length - 1] !== current)) {
        head.appendChild(current);
      }
      return true;
    } catch {
      return false;
    }
  }

  function diagnostics() {
    return {
      state: STATES.has(lastState) ? lastState : "unknown",
      updateRevision,
      forcedUpdates,
      lastAppliedAgeMs: lastAppliedAt ? Math.max(0, Date.now() - lastAppliedAt) : 0
    };
  }

  globalThis.__chatgptMultiChatColorStatus = Object.freeze({ apply, diagnostics });
})();
