(() => {
  "use strict";
  if (globalThis.__chatgptZenAudio) return;
  // Firefox MV3 uses an event page for background.scripts, not chrome.offscreen.
  // Audio autoplay can be denied; failures must not crash status monitoring.
  const queue = [];
  const allowed = new Set(["pop","potion","point","chan","cash-register","page-turn","off"]);
  let playing = false;
  async function drain() {
    if (playing || !queue.length) return;
    playing = true;
    const item = queue.shift();
    let audio;
    function finish() {
      if (!playing) return;
      playing = false;
      void drain();
    }
    try {
      audio = new Audio(browser.runtime.getURL("sounds/" + item.sound + ".wav"));
      audio.volume = Math.max(0, Math.min(1, Number(item.volume) || 0));
      audio.addEventListener("ended", finish, { once: true });
      audio.addEventListener("error", finish, { once: true });
      await audio.play();
      item.resolve(true);
    } catch {
      item.resolve(false);
      finish();
    }
  }
  globalThis.__chatgptZenAudio = Object.freeze({
    play(sound, volume) {
      if (!allowed.has(sound) || sound === "off") return Promise.resolve(false);
      return new Promise(resolve => {
        queue.push({sound,volume,resolve});
        void drain();
      });
    }
  });
})();
