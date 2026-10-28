(() => {
  "use strict";
  if (globalThis.__chatgptMultiChatColorStatus) return;

  const ICON_ID = "chatgpt-multichat-monitor-color-favicon";
  const ICON_DIR = "assets/tab-status/";
  const STATES = new Set(["working", "finished", "attention", "error", "retry", "interrupted", "draft", "pending", "idle"]);

  function apply(state) {
    try {
      if (!globalThis.document?.head || !globalThis.chrome?.runtime?.getURL) return false;
      const normalized = STATES.has(state) ? state : "idle";
      const head = document.head;
      const iconUrl = chrome.runtime.getURL(ICON_DIR + normalized + ".svg");
      const current = document.getElementById(ICON_ID);

      if (!current || current.tagName !== "LINK" ||
          current.getAttribute("href") !== iconUrl) {
        // Replacing the element on *real* state changes makes Chromium/Vivaldi
        // refresh its favicon even when it ignores href mutations on a link.
        // Never reload the tab or replace ChatGPT's own favicon links.
        const next = document.createElement("link");
        next.id = ICON_ID;
        next.rel = "icon";
        next.type = "image/svg+xml";
        next.sizes = "any";
        next.setAttribute("href", iconUrl);
        head.appendChild(next);
        current?.remove();
        return true;
      }

      // ChatGPT may insert its own favicon after a SPA navigation. Keep the
      // extension icon last, without modifying the DOM on every evaluation.
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

  globalThis.__chatgptMultiChatColorStatus = Object.freeze({ apply });
})();
