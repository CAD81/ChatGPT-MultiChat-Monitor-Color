(() => {
  "use strict";
  if (globalThis.__chatgptZenTabTitle) return;
  // The tab title is a deliberate WebExtension -> userChrome.css bridge.
  // It avoids Vivaldi/Chromium's stale browser favicon cache.
  const states = new Set(["working", "finished", "attention", "error", "retry",
                          "interrupted", "draft", "pending"]);
  const marker = /\s*\[GPTMM:(?:working|finished|attention|error|retry|interrupted|draft|pending)\]\s*$/;
  const cleanTitle = value => String(value || "").replace(marker, "");
  let lastState = "idle";
  let disposed = false;
  function sync() {
    if (disposed) return;
    const observed = globalThis.__chatgptMultiChatColorStatus?.diagnostics()?.state;
    const state = states.has(observed) ? observed : "idle";
    const original = cleanTitle(document.title);
    const next = state === "idle" ? original : original + " [GPTMM:" + state + "]";
    lastState = state;
    if (document.title !== next) document.title = next;
  }
  function restore() {
    const original = cleanTitle(document.title);
    if (document.title !== original) document.title = original;
  }
  const observer = new MutationObserver(sync);
  observer.observe(document.head || document.documentElement,
    { childList: true, subtree: true, characterData: true });
  const timer = setInterval(sync, 1000);
  addEventListener("pagehide", restore);
  addEventListener("pageshow", sync);
  globalThis.__chatgptZenTabTitle = Object.freeze({
    cleanTitle, sync,
    diagnostics: () => ({state: lastState, tagged: document.title !== cleanTitle(document.title)}),
    dispose: () => {disposed = true; observer.disconnect(); clearInterval(timer); restore();}
  });
  sync();
})();
