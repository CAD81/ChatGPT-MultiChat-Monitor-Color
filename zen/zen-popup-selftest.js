(() => {
  "use strict";
  const button = document.getElementById("zenTestTabColors");
  const feedback = document.getElementById("zenColorTestMessage");
  if (!button || !feedback) return;
  button.addEventListener("click", async () => {
    button.disabled = true;
    feedback.textContent = "Prüfe aktiven ChatGPT-Tab ...";
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab || !/^https:\/\/chatgpt\.com(?:\/|$)/.test(tab.url || "")) {
        feedback.textContent = "Bitte zuerst einen ChatGPT-Tab aktivieren.";
        return;
      }
      const result = await browser.tabs.sendMessage(tab.id, { type: "monitor-zen-color-selftest" });
      feedback.textContent = result?.ok
        ? "12-Sekunden-Test gestartet: Gelb, Grün, Rot (je 4 Sekunden). Nur die Tab-Farbe wird simuliert."
        : "Test nicht gestartet. ChatGPT-Tab neu laden und erneut versuchen.";
    } catch {
      feedback.textContent = "Keine Verbindung zum ChatGPT-Tab. Tab neu laden und erneut versuchen.";
    } finally {
      button.disabled = false;
    }
  });
})();
