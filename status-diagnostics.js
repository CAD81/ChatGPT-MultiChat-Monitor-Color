(() => {
  "use strict";

  // Pure, allow-list-only diagnostics. No tab titles, URLs, prompts, response
  // texts, DOM markup, cookies, or raw attribute strings enter a report.
  const STATES = new Set([
    "working", "finished", "attention", "error", "retry",
    "interrupted", "draft", "pending", "idle"
  ]);
  const CAP = (v, max) => Number.isFinite(Number(v))
    ? Math.max(0, Math.min(max, Math.round(Number(v)))) : 0;
  const STATUS = (value) => STATES.has(value) ? value : "unknown";
  const BOOL = (value) => value === true;

  function faviconKind(value) {
    const url = typeof value === "string" ? value : "";
    if (!url) return "missing";
    if (url.startsWith("data:")) return "data-url";
    if (url.includes("/assets/tab-status/")) return "extension-status-svg";
    if (url.startsWith("chrome-extension:")) return "other-extension-icon";
    return "other-icon";
  }

  function makeSample(local = {}, monitor = null, favIconUrl = "", extensionVersion = "") {
    // A bounded report with only known structured fields. Never spread local,
    // monitor or tab objects as those may contain sensitive conversation data.
    const inventory = local.signalInventory || {};
    return {
      extensionVersion: /^\d+\.\d+\.\d+$/.test(extensionVersion) ? extensionVersion : "unknown",
      scriptVersion: /^\d+\.\d+\.\d+$/.test(local.scriptVersion || "")
        ? local.scriptVersion : "unknown",
      bootstrapped: BOOL(local.initialized),
      localState: STATUS(local.localState),
      monitorState: STATUS(monitor?.state),
      visualState: STATUS(local.visualState),
      iconState: STATUS(local.iconState),
      faviconLinkLast: BOOL(local.faviconLinkLast),
      browserFaviconKind: faviconKind(favIconUrl),
      stopButtonVisible: BOOL(local.stopButtonVisible),
      progressIndicatorVisible: BOOL(local.progressIndicatorVisible),
      recentWorkingEvidence: BOOL(local.recentWorkingEvidence),
      documentHidden: BOOL(local.documentHidden),
      lastEvaluationAgeMs: CAP(local.lastEvaluationAgeMs, 600000),
      evaluationCount: CAP(local.evaluationCount, 999999),
      signals: {
        visibleComposerButtons: CAP(inventory.visibleComposerButtons, 100),
        squareStopCandidates: CAP(inventory.squareStopCandidates, 100),
        recognizedStopButtons: CAP(inventory.recognizedStopButtons, 100),
        visibleBusyIndicators: CAP(inventory.visibleBusyIndicators, 100)
      },
      transitions: (Array.isArray(local.transitions) ? local.transitions : [])
        .slice(-15).map((event) => ({
          from: STATUS(event?.from),
          to: STATUS(event?.to),
          secondsAgo: CAP(event?.secondsAgo, 7200)
        }))
    };
  }

  function diagnosis(sample) {
    if (sample.scriptVersion === "unknown") return "Altes oder fehlendes Tab-Skript. Tab nach Sicherung neu laden.";
    if (sample.scriptVersion !== sample.extensionVersion) return "Tab hat ein veraltetes Skript. Manuell neu laden.";
    if (!sample.bootstrapped) return "Erkennung wird noch initialisiert.";
    if ((sample.stopButtonVisible || sample.progressIndicatorVisible) && sample.localState !== "working") {
      return "Erkennungswiderspruch: ChatGPT arbeitet, aber lokaler Status ist nicht Arbeitet.";
    }
    if (sample.localState !== "working" && sample.signals.squareStopCandidates > 0 &&
        sample.signals.recognizedStopButtons === 0) {
      return "Verdacht: Stopp-Symbol sichtbar, aber dessen Form wird nicht erkannt.";
    }
    if (sample.localState !== sample.iconState &&
        !(sample.localState === "idle" && sample.visualState === "pending" && sample.iconState === "pending")) {
      return "Favicon stimmt nicht mit dem erkannten Status überein.";
    }
    if (sample.localState === "working" && sample.monitorState !== "working") {
      return "Monitor hat den lokalen Arbeitsstatus nicht übernommen.";
    }
    if (sample.localState === "working" && sample.iconState === "working") {
      return "Arbeit und Favicon erkannt. Bei weiterhin grauem Tab-Hintergrund liegt der nächste Prüfschritt bei Vivaldi-CSS.";
    }
    return "Kein eindeutiger Widerspruch in dieser Momentaufnahme. Messung während einer laufenden Antwort starten.";
  }

  globalThis.__chatgptMultichatDiagnosticReport = Object.freeze({
    makeSample, diagnosis
  });
})();
