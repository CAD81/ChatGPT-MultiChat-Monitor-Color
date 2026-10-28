(() => {
  "use strict";
  if (globalThis.__chatgptMultiChatColorStatus) return;

  const ICON_ID = "chatgpt-multichat-monitor-color-favicon";
  const ICON_DIR = "assets/tab-status/";
  const STATES = new Set(["working","finished","attention","error","retry","interrupted","draft","pending","idle"]);

  // Only the local ChatGPT document is changed. Browser UI colors are provided
  // separately by the optional Vivaldi CSS modification.
  function apply(state) {
    try {
      if (!globalThis.document?.head || !globalThis.chrome?.runtime?.getURL) return false;
      const normalized = STATES.has(state) ? state : "idle";
      const head = document.head;
      const iconUrl = chrome.runtime.getURL(ICON_DIR + normalized + ".svg");
      let icon = document.getElementById(ICON_ID);

      if (!icon || icon.tagName !== "LINK") {
        icon = document.createElement("link");
        icon.id = ICON_ID;
        icon.rel = "icon";
        icon.type = "image/svg+xml";
        icon.sizes = "any";
        icon.setAttribute("href", iconUrl);
        head.appendChild(icon);
      } else {
        if (icon.getAttribute("href") !== iconUrl) icon.setAttribute("href", iconUrl);
        if (icon.parentNode !== head) head.appendChild(icon);
      }

      // ChatGPT can insert its own favicon after SPA navigation. Move ours
      // behind site icons only when needed; otherwise DOM observers could loop.
      const icons = document.querySelectorAll('link[rel~="icon"]');
      if (icons.length && icons[icons.length - 1] !== icon) head.appendChild(icon);
      return true;
    } catch {
      return false;
    }
  }

  globalThis.__chatgptMultiChatColorStatus = Object.freeze({ apply });
})();
