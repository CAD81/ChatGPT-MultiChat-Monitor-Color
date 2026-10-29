const DEFAULTS = {
  monitorEnabled: true,
  monitorShowIdle: true,
  monitorCompact: false,
  monitorAnimations: true,
  monitorOpacity: 1,
  monitorHoverFocus: false,
  monitorTheme: "dark",
  monitorGroupMode: "project",
  monitorLayoutLocked: false,
  monitorSoundsEnabled: true,
  monitorSoundDone: "pop",
  monitorSoundRetry: "potion",
  monitorSoundAttention: "point",
  monitorSoundError: "chan",
  monitorSoundVolume: 0.8
};

const enabled = document.getElementById("enabled");
const showIdle = document.getElementById("showIdle");
const compact = document.getElementById("compact");
const groupMode = document.getElementById("groupMode");
const theme = document.getElementById("theme");
const opacity = document.getElementById("opacity");
const opacityValue = document.getElementById("opacityValue");
const hoverFocus = document.getElementById("hoverFocus");
const animations = document.getElementById("animations");

const resetPosition = document.getElementById("resetPosition");
const resetSize = document.getElementById("resetSize");
const restoreHidden = document.getElementById("restoreHidden");
const restoreHiddenData = document.getElementById("restoreHiddenData");
const clearAliases = document.getElementById("clearAliases");
const clearPins = document.getElementById("clearPins");
const clearPending = document.getElementById("clearPending");
const resetOrder = document.getElementById("resetOrder");
const resetLayout = document.getElementById("resetLayout");
const clearHistory = document.getElementById("clearHistory");
const historyRoot = document.getElementById("history");
const historySummary = document.getElementById("historySummary");

const tabDiagnostics = document.getElementById("tabDiagnostics");
const refreshTabDiagnostics = document.getElementById("refreshTabDiagnostics");
const captureTabDiagnostics = document.getElementById("captureTabDiagnostics");
const copyTabDiagnostics = document.getElementById("copyTabDiagnostics");
const diagnosticProgress = document.getElementById("diagnosticProgress");
const diagnosticReportText = document.getElementById("diagnosticReportText");
const reportTools = globalThis.__chatgptMultichatDiagnosticReport;

const STATUS_TRANSLATIONS = Object.freeze({
  working: "Arbeitet", finished: "Fertig", attention: "Eingriff nötig",
  error: "Fehler", retry: "Wiederholen", interrupted: "Unterbrochen",
  draft: "Entwurf", pending: "Vorgemerkt", idle: "Inaktiv",
  unknown: "Unbekannt"
});

let lastDiagnosticReport = null;
let diagnosticCaptureRunning = false;

function statusName(state) {
  return STATUS_TRANSLATIONS[state] || "Unbekannt";
}

function appendDiagnostic(label, value) {
  const row = document.createElement("div");
  row.className = "tab-diagnostics-row";
  const caption = document.createElement("span");
  caption.textContent = label;
  const result = document.createElement("span");
  result.textContent = value;
  row.append(caption, result);
  tabDiagnostics.appendChild(row);
}

async function diagnosticActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab && /^https:\/\/chatgpt\.com\//.test(String(tab.url || "")) ? tab : null;
}

async function collectDiagnosticSample(tabId) {
  const [local, monitor, tab] = await Promise.all([
    chrome.tabs.sendMessage(tabId, { type: "monitor-get-status-diagnostics" }).catch(() => null),
    chrome.runtime.sendMessage({ type: "monitor-get-snapshot" }).catch(() => null),
    chrome.tabs.get(tabId).catch(() => null)
  ]);
  // No tab URL or title is included; the pure reporting helper only accepts
  // one monitor record and the browser favicon URL to classify its *kind*.
  const row = Array.isArray(monitor?.chats)
    ? monitor.chats.find((item) => item.tabId === tabId) || null : null;
  return reportTools.makeSample(
    local || {},
    row,
    tab?.favIconUrl || "",
    chrome.runtime.getManifest().version
  );
}

function renderDiagnosticSample(sample) {
  tabDiagnostics.replaceChildren();
  appendDiagnostic("Erkennung", statusName(sample.localState));
  appendDiagnostic("Monitor", statusName(sample.monitorState));
  appendDiagnostic("Tab-Symbol", statusName(sample.iconState));
  appendDiagnostic("Skriptversion", sample.scriptVersion);
  appendDiagnostic("Stopp-Button erkannt", sample.stopButtonVisible ? "Ja" : "Nein");
  appendDiagnostic("Arbeitsanzeige", sample.progressIndicatorVisible ? "Ja" : "Nein");
  appendDiagnostic("Quadratische SVG-Symbole", String(sample.signals.squareStopCandidates));
  appendDiagnostic("Erkannte Stopp-Schaltflächen", String(sample.signals.recognizedStopButtons));
  appendDiagnostic("Letzte Auswertung", sample.lastEvaluationAgeMs + " ms");
  appendDiagnostic("Vivaldi-Favicon-Quelle", sample.browserFaviconKind);
  appendDiagnostic("Favicon im HTML zuletzt", sample.faviconLinkLast ? "Ja" : "Nein");
  appendDiagnostic("Statuswechsel (letzte)", String(sample.transitions.length));
  appendDiagnostic("Bewertung", reportTools.diagnosis(sample));
}

function newDiagnosticReport() {
  return {
    format: "chatgpt-multichat-status-diagnostic-v1",
    createdAt: new Date().toISOString(),
    // Report contains allow-listed technical flags and counters only.
    samples: []
  };
}

async function loadTabDiagnostics() {
  if (diagnosticCaptureRunning) return;
  refreshTabDiagnostics.disabled = true;
  diagnosticProgress.textContent = "Prüfe aktiven ChatGPT-Tab …";
  try {
    const tab = await diagnosticActiveTab();
    if (!tab) {
      tabDiagnostics.textContent = "Bitte zuerst einen ChatGPT-Tab öffnen.";
      return;
    }
    const sample = await collectDiagnosticSample(tab.id);
    const report = newDiagnosticReport();
    report.samples.push(sample);
    lastDiagnosticReport = report;
    copyTabDiagnostics.disabled = false;
    diagnosticReportText.value = JSON.stringify(report, null, 2);
    renderDiagnosticSample(sample);
    diagnosticProgress.textContent = "Momentaufnahme fertig. Bei laufender Antwort: 10 Sekunden messen.";
  } catch {
    tabDiagnostics.textContent = "Diagnose fehlgeschlagen. Tab gegebenenfalls nach Sicherung neu laden.";
  } finally {
    refreshTabDiagnostics.disabled = false;
  }
}

async function recordTabDiagnostics() {
  if (diagnosticCaptureRunning) return;
  const tab = await diagnosticActiveTab().catch(() => null);
  if (!tab) {
    diagnosticProgress.textContent = "Bitte zuerst einen ChatGPT-Tab öffnen.";
    return;
  }

  diagnosticCaptureRunning = true;
  captureTabDiagnostics.disabled = true;
  refreshTabDiagnostics.disabled = true;
  copyTabDiagnostics.disabled = true;
  const report = newDiagnosticReport();
  lastDiagnosticReport = null;
  diagnosticReportText.value = "";

  try {
    // Ten bounded samples from one fixed tab. This does not keep monitoring
    // after the user closes the popup and writes nothing to browser storage.
    for (let i = 0; i < 10; i += 1) {
      diagnosticProgress.textContent = "Live-Messung: " + (i + 1) + " von 10";
      const sample = await collectDiagnosticSample(tab.id);
      report.samples.push(sample);
      renderDiagnosticSample(sample);
      if (i < 9) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    lastDiagnosticReport = report;
    diagnosticReportText.value = JSON.stringify(report, null, 2);
    copyTabDiagnostics.disabled = false;
    const working = report.samples.filter((item) => item.localState === "working").length;
    diagnosticProgress.textContent = "Messung fertig. " + working +
      "/10 Proben als Arbeitet erkannt. Bericht kopieren und hier einfügen.";
  } catch {
    if (report.samples.length) {
      lastDiagnosticReport = report;
      diagnosticReportText.value = JSON.stringify(report, null, 2);
      copyTabDiagnostics.disabled = false;
    }
    diagnosticProgress.textContent = "Messung unterbrochen. Vorhandene Proben können kopiert werden.";
  } finally {
    diagnosticCaptureRunning = false;
    captureTabDiagnostics.disabled = false;
    refreshTabDiagnostics.disabled = false;
  }
}

async function copyDiagnosticReport() {
  if (!lastDiagnosticReport) return;
  const json = JSON.stringify(lastDiagnosticReport, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    diagnosticProgress.textContent = "Technischen Bericht kopiert. Du kannst ihn in ChatGPT einfügen.";
  } catch {
    // Copy fallback is still explicitly user initiated. Never upload or log.
    diagnosticReportText.hidden = false;
    diagnosticReportText.value = json;
    diagnosticReportText.focus();
    diagnosticReportText.select();
    diagnosticProgress.textContent = "Kopieren nicht erlaubt. Bericht unten markieren und mit Strg+C kopieren.";
  }
}

refreshTabDiagnostics.addEventListener("click", loadTabDiagnostics);
captureTabDiagnostics.addEventListener("click", recordTabDiagnostics);
copyTabDiagnostics.addEventListener("click", copyDiagnosticReport);

const updateNotice = document.getElementById("updateNotice");
const updateVersion = document.getElementById("updateVersion");
const updateLink = document.getElementById("updateLink");
const dismissUpdate = document.getElementById("dismissUpdate");
const whatsNewNotice = document.getElementById("whatsNewNotice");
const whatsNewVersion = document.getElementById("whatsNewVersion");
const whatsNewLink = document.getElementById("whatsNewLink");
const dismissWhatsNew = document.getElementById("dismissWhatsNew");

const soundsEnabled = document.getElementById("soundsEnabled");
const soundSettings = document.getElementById("soundSettings");
const soundSummary = document.getElementById("soundSummary");
const soundDone = document.getElementById("soundDone");
const soundRetry = document.getElementById("soundRetry");
const soundAttention = document.getElementById("soundAttention");
const soundError = document.getElementById("soundError");
const soundVolume = document.getElementById("soundVolume");
const soundTests = [...document.querySelectorAll(".sound-test")];

const SOUND_CONTROLS = {
  monitorSoundDone: soundDone,
  monitorSoundRetry: soundRetry,
  monitorSoundAttention: soundAttention,
  monitorSoundError: soundError
};

function resolvedTheme(value) {
  if (["light", "dark", "cozy", "neon", "minimal"].includes(value)) return value;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyPopupTheme(value) {
  document.documentElement.dataset.theme = resolvedTheme(value);
}

function refreshLayoutResetUi(locked) {
  const isLocked = locked === true;
  for (const button of [resetPosition, resetSize, resetOrder, resetLayout]) {
    button.disabled = false;
    button.setAttribute("aria-disabled", isLocked ? "true" : "false");
    button.title = isLocked ? "Layout locked — click to highlight the lock" : "";
  }
}

async function runLayoutReset(button, fallback, type, successText) {
  const response = await chrome.runtime.sendMessage({ type }).catch(() => null);
  const result = response?.locked
    ? "Locked"
    : response?.ok
      ? successText
      : "Failed";
  showButtonResult(button, result, fallback);
  return response;
}

function updateOpacityValue(value) {
  const numeric = Number(value);
  opacityValue.textContent = Math.round((Number.isFinite(numeric) ? numeric : 1) * 100) + "%";
}

function relativeTime(timestamp) {
  const seconds = Math.max(0, Math.floor((Date.now() - Number(timestamp || 0)) / 1000));
  if (seconds < 60) return seconds + "s";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + "m";
  return Math.floor(minutes / 60) + "h";
}

function stateLabel(state) {
  return ({
    working: "working",
    attention: "attention",
    retry: "retry",
    error: "error",
    finished: "done",
    interrupted: "stopped"
  })[state] || state || "event";
}

function renderHistory(items) {
  const values = Array.isArray(items) ? items.slice(0, 12) : [];
  historySummary.textContent = String(values.length);
  historyRoot.replaceChildren();

  if (values.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No recent activity";
    historyRoot.appendChild(empty);
    return;
  }

  for (const item of values) {
    const event = document.createElement("div");
    event.className = "event";

    const top = document.createElement("div");
    top.className = "event-top";

    const state = document.createElement("span");
    state.className = "event-state";
    state.textContent = stateLabel(item.state);

    const title = document.createElement("span");
    title.className = "event-title";
    title.textContent = item.title || "ChatGPT";

    const time = document.createElement("span");
    time.className = "event-time";
    time.textContent = relativeTime(item.ts) + " ago";

    top.append(state, title, time);
    event.appendChild(top);
    historyRoot.appendChild(event);
  }
}

async function loadHistory() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "monitor-get-history" });
    renderHistory(response?.history || []);
  } catch {
    renderHistory([]);
  }
}

function renderUpdateInfo(info) {
  const latest = String(info?.latestVersion || "");
  const hasUpdate = info?.updateAvailable === true && latest;

  updateNotice.hidden = !hasUpdate;
  if (hasUpdate) {
    updateVersion.textContent = "v" + latest;
    updateLink.href = info.latestUrl || "https://github.com/JoelMomo/chatgpt-multichat-monitor/releases";
  }

  const whatsNew = info?.whatsNew;
  const hasWhatsNew = Boolean(whatsNew?.version);
  whatsNewNotice.hidden = !hasWhatsNew;

  if (hasWhatsNew) {
    whatsNewVersion.textContent = "v" + whatsNew.version;
    whatsNewLink.href = whatsNew.url ||
      "https://github.com/JoelMomo/chatgpt-multichat-monitor/releases";
  }
}

async function loadUpdateInfo() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "monitor-get-update-info"
    });
    renderUpdateInfo(response || {});
  } catch {
    renderUpdateInfo({});
  }
}

function refreshSoundUi() {
  const active = soundsEnabled.checked;
  soundSettings.classList.toggle("muted", !active);
  soundSummary.textContent = active ? "On" : "Off";
}

async function testSound(select) {
  const sound = select?.value || "off";
  if (sound === "off") return;

  await chrome.runtime.sendMessage({
    type: "monitor-test-sound",
    sound,
    volume: Number(soundVolume.value)
  }).catch(() => {});
}

function showButtonResult(button, text, fallback) {
  button.textContent = text;
  setTimeout(() => {
    button.textContent = fallback;
  }, 1000);
}

async function clearPreferenceField(field, button, doneText, fallback) {
  const response = await chrome.runtime.sendMessage({
    type: "monitor-clear-chat-pref-field",
    field
  }).catch(() => null);

  showButtonResult(button, response?.ok ? doneText : "Failed", fallback);
}

async function restoreHiddenChats(button) {
  const response = await chrome.runtime.sendMessage({
    type: "monitor-unhide-all"
  }).catch(() => null);

  showButtonResult(button, response?.ok ? "Restored" : "Failed", button === restoreHidden ? "Restore hidden" : "Restore hidden chats");
}

async function load() {
  const settings = await chrome.storage.local.get(DEFAULTS);

  enabled.checked = settings.monitorEnabled !== false;
  showIdle.checked = settings.monitorShowIdle === true;
  compact.checked = settings.monitorCompact === true;
  groupMode.value = ["project", "manual", "none"].includes(settings.monitorGroupMode)
    ? settings.monitorGroupMode
    : DEFAULTS.monitorGroupMode;
  theme.value = settings.monitorTheme || DEFAULTS.monitorTheme;
  opacity.value = settings.monitorOpacity ?? DEFAULTS.monitorOpacity;
  updateOpacityValue(opacity.value);
  hoverFocus.checked = settings.monitorHoverFocus === true;
  applyPopupTheme(theme.value);
  animations.checked = settings.monitorAnimations !== false;
  refreshLayoutResetUi(settings.monitorLayoutLocked === true);

  soundsEnabled.checked = settings.monitorSoundsEnabled !== false;
  soundDone.value = settings.monitorSoundDone || DEFAULTS.monitorSoundDone;
  soundRetry.value = settings.monitorSoundRetry || DEFAULTS.monitorSoundRetry;
  soundAttention.value = settings.monitorSoundAttention || DEFAULTS.monitorSoundAttention;
  soundError.value = settings.monitorSoundError || DEFAULTS.monitorSoundError;
  soundVolume.value = settings.monitorSoundVolume ?? DEFAULTS.monitorSoundVolume;

  refreshSoundUi();
  await Promise.all([
    loadHistory(),
    loadUpdateInfo(),
    loadTabDiagnostics()
  ]);
}

enabled.addEventListener("change", () => {
  chrome.storage.local.set({ monitorEnabled: enabled.checked });
});

showIdle.addEventListener("change", () => {
  chrome.storage.local.set({ monitorShowIdle: showIdle.checked });
});

compact.addEventListener("change", () => {
  chrome.storage.local.set({ monitorCompact: compact.checked });
});

groupMode.addEventListener("change", () => {
  chrome.storage.local.set({ monitorGroupMode: groupMode.value });
});

theme.addEventListener("change", () => {
  chrome.storage.local.set({ monitorTheme: theme.value });
  applyPopupTheme(theme.value);
});

opacity.addEventListener("input", () => {
  const value = Number(opacity.value);
  updateOpacityValue(value);
  chrome.storage.local.set({ monitorOpacity: value });
});

hoverFocus.addEventListener("change", () => {
  chrome.storage.local.set({ monitorHoverFocus: hoverFocus.checked });
});

animations.addEventListener("change", () => {
  chrome.storage.local.set({ monitorAnimations: animations.checked });
});

resetPosition.addEventListener("click", async () => {
  await runLayoutReset(resetPosition, "Reset position", "monitor-reset-position", "Reset");
});

resetSize.addEventListener("click", async () => {
  await runLayoutReset(resetSize, "Auto size", "monitor-reset-size", "Auto");
});

restoreHidden.addEventListener("click", () => restoreHiddenChats(restoreHidden));
restoreHiddenData.addEventListener("click", () => restoreHiddenChats(restoreHiddenData));

clearAliases.addEventListener("click", () => {
  clearPreferenceField("alias", clearAliases, "Cleared", "Clear aliases");
});

clearPins.addEventListener("click", () => {
  clearPreferenceField("pinned", clearPins, "Cleared", "Clear pins");
});

clearPending.addEventListener("click", () => {
  clearPreferenceField("pending", clearPending, "Cleared", "Clear pending");
});

resetOrder.addEventListener("click", async () => {
  await runLayoutReset(resetOrder, "Reset chat order", "monitor-reset-chat-order", "Reset");
});

resetLayout.addEventListener("click", async () => {
  await runLayoutReset(resetLayout, "Reset layout", "monitor-reset-layout", "Reset");
});

soundsEnabled.addEventListener("change", () => {
  chrome.storage.local.set({ monitorSoundsEnabled: soundsEnabled.checked });
  refreshSoundUi();
});

for (const [storageKey, select] of Object.entries(SOUND_CONTROLS)) {
  select.addEventListener("change", () => {
    chrome.storage.local.set({ [storageKey]: select.value });
  });
}

soundVolume.addEventListener("input", () => {
  chrome.storage.local.set({ monitorSoundVolume: Number(soundVolume.value) });
});

for (const button of soundTests) {
  button.addEventListener("click", () => {
    const select = document.getElementById(button.dataset.soundKey);
    testSound(select);
  });
}

clearHistory.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "monitor-clear-history" }).catch(() => {});
  renderHistory([]);
  showButtonResult(clearHistory, "Cleared", "Clear history");
});

dismissUpdate.addEventListener("click", async () => {
  const version = updateVersion.textContent.replace(/^v/i, "");
  const response = await chrome.runtime.sendMessage({
    type: "monitor-dismiss-update",
    version
  }).catch(() => null);

  if (response?.ok) renderUpdateInfo(response);
});

dismissWhatsNew.addEventListener("click", async () => {
  const version = whatsNewVersion.textContent.replace(/^v/i, "");
  const response = await chrome.runtime.sendMessage({
    type: "monitor-dismiss-whats-new",
    version
  }).catch(() => null);

  if (response?.ok) renderUpdateInfo(response);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.monitorLayoutLocked) {
    refreshLayoutResetUi(changes.monitorLayoutLocked.newValue === true);
  }
});

window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
  if (theme.value === "system") applyPopupTheme("system");
});

load();
