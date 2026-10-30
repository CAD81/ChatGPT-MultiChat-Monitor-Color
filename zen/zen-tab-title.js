(() => {
  "use strict";
  if (globalThis.__chatgptZenTabTitle) return;
  // Firefox/Zen has no API for styling native tabs. The reversible title
  // suffix is read by userChrome.css, never sent to a remote service.
  const states = new Set(["working", "finished", "attention", "error", "retry",
                          "interrupted", "draft", "pending"]);
  const marker = /\s*\[GPTMM:(?:working|finished|attention|error|retry|interrupted|draft|pending)\]\s*$/;
  const cleanTitle = value => String(value || "").replace(marker, "");
  const TEST_STATES = Object.freeze(["working", "finished", "error"]);
  const TEST_STEP_MS = 4000;
  let lastState = "idle";
  let disposed = false;
  let suspended = false;
  let testStartedAt = 0;

  function requestedState() {
    if (testStartedAt > 0) {
      const stage = Math.floor((Date.now() - testStartedAt) / TEST_STEP_MS);
      if (stage >= 0 && stage < TEST_STATES.length) return TEST_STATES[stage];
      testStartedAt = 0;
    }
    try {
      const observed = globalThis.__chatgptMultiChatColorStatus?.diagnostics()?.state;
      return states.has(observed) ? observed : "idle";
    } catch {
      return "idle";
    }
  }

  function sync() {
    if (disposed || suspended) return;
    const state = requestedState();
    const original = cleanTitle(document.title);
    const next = state === "idle" ? original : original + " [GPTMM:" + state + "]";
    lastState = state;
    if (document.title !== next) document.title = next;
  }

  function restore() {
    const original = cleanTitle(document.title);
    if (document.title !== original) document.title = original;
  }

  function startColorSelfTest() {
    if (disposed || suspended) return false;
    testStartedAt = Date.now();
    sync();
    return true;
  }

  const observer = new MutationObserver(sync);
  observer.observe(document.head || document.documentElement,
    { childList: true, subtree: true, characterData: true });
  const timer = setInterval(sync, 500);
  addEventListener("pagehide", () => {
    suspended = true;
    testStartedAt = 0;
    restore();
  });
  addEventListener("pageshow", () => {
    suspended = false;
    sync();
  });
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "monitor-zen-color-selftest") return false;
    sendResponse({ ok: startColorSelfTest(), durationMs: TEST_STEP_MS * TEST_STATES.length });
    return true;
  });

  globalThis.__chatgptZenTabTitle = Object.freeze({
    cleanTitle, sync, startColorSelfTest,
    diagnostics: () => ({
      state: lastState,
      tagged: document.title !== cleanTitle(document.title),
      selfTestActive: testStartedAt > 0 &&
        Date.now() - testStartedAt < TEST_STEP_MS * TEST_STATES.length
    }),
    dispose: () => {
      disposed = true;
      testStartedAt = 0;
      observer.disconnect();
      clearInterval(timer);
      restore();
    }
  });
  sync();
})();
