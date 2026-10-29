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

const STATUS_TRANSLATIONS = Object.freeze({
  working: "Arbeitet", finished: "Fertig", attention: "Eingriff nötig",
  error: "Fehler", retry: "Wiederholen", interrupted: "Unterbrochen",
  draft: "Entwurf", pending: "Vorgemerkt", idle: "Inaktiv"
});

function statusName(state) {
  return STATUS_TRANSLATIONS[state] || String(state || "Unbekannt");
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

async function loadTabDiagnostics() {
  refreshTabDiagnostics.disabled = true;
  tabDiagnostics.textContent = "Lade Status …";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https:\/\/chatgpt\.com\//.test(String(tab.url || ""))) {
      tabDiagnostics.textContent = "Bitte zuerst einen ChatGPT-Tab öffnen.";
      return;
    }

    const [local, snapshot] = await Promise.all([
      chrome.tabs.sendMessage(tab.id, { type: "monitor-get-status-diagnostics" })
        .catch(() => null),
      chrome.runtime.sendMessage({ type: "monitor-get-snapshot" })
        .catch(() => null)
    ]);
    if (!local || typeof local.scriptVersion !== "string") {
      tabDiagnostics.textContent = "Kein aktuelles Diagnoseskript im Tab. Nach dem Speichern ungesendeter Eingaben diesen ChatGPT-Tab manuell neu laden.";
      return;
    }

    const row = Array.isArray(snapshot?.chats)
      ? snapshot.chats.find((chat) => chat.tabId === tab.id)
      : null;
    const installedVersion = chrome.runtime.getManifest().version;

    tabDiagnostics.replaceChildren();
    appendDiagnostic("Erkennung", statusName(local.localState));
    appendDiagnostic("Monitor", row ? statusName(row.state) : "Nicht verfügbar");
    appendDiagnostic("Tab-Symbol", statusName(local.iconState));
    appendDiagnostic("Stopp-Button sichtbar", local.stopButtonVisible ? "Ja" : "Nein");
    appendDiagnostic("Arbeitsanzeige sichtbar", local.progressIndicatorVisible ? "Ja" : "Nein");
    appendDiagnostic("Arbeitsstatus zuletzt gesehen", local.recentWorkingEvidence ? "Kürzlich" : "Nein");
    appendDiagnostic("Skriptversion", local.scriptVersion);

    if (local.scriptVersion !== installedVersion) {
      appendDiagnostic("Hinweis", "Altes Tab-Skript – Tab nach Sicherung neu laden");
    } else if (local.localState !== "working" &&
        (local.stopButtonVisible || local.progressIndicatorVisible)) {
      appendDiagnostic("Widerspruch", "Laufender Chat trotz inaktivem Status");
    } else if (local.localState !== local.iconState &&
        !(local.localState === "idle" && local.visualState === "pending")) {
      appendDiagnostic("Widerspruch", "Favicon stimmt nicht mit Erkennung überein");
    }
  } catch {
    tabDiagnostics.textContent = "Diagnose nicht verfügbar. ChatGPT-Tab öffnen und erneut prüfen.";
  } finally {
    refreshTabDiagnostics.disabled = false;
  }
}

refreshTabDiagnostics.addEventListener("click", loadTabDiagnostics);

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
