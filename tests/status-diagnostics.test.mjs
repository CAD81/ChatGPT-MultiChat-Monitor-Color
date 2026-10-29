import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = fs.readFileSync(path.join(root, "status-diagnostics.js"), "utf8");
const popupHtml = fs.readFileSync(path.join(root, "popup.html"), "utf8");
const popupJs = fs.readFileSync(path.join(root, "popup.js"), "utf8");
const ctx = {};
ctx.globalThis = ctx;
vm.runInNewContext(script, ctx);
const { makeSample, diagnosis } = ctx.__chatgptMultichatDiagnosticReport;

function sample(overrides = {}, monitor = { state: "idle" }) {
  return makeSample({
    scriptVersion: "0.4.7",
    initialized: true, localState: "idle",
    iconState: "idle", visualState: "idle",
    signalInventory: { visibleComposerButtons: 1, squareStopCandidates: 0,
      recognizedStopButtons: 0, visibleBusyIndicators: 0 },
    ...overrides
  }, monitor, "data:image/png;base64,aGVsbG8=", "0.4.7");
}

test("diagnostic report only contains allow-listed state and counter fields", () => {
  const secret = "secret-private-conversation-string";
  const result = makeSample({
    scriptVersion: "0.4.7",
    initialized: true,
    localState: "working",
    iconState: "idle",
    visualState: "working",
    title: secret, url: "https://chatgpt.com/c/" + secret,
    prompt: secret, userText: secret,
    signalInventory: {
      squareStopCandidates: 3,
      visibleComposerButtons: 1,
      recognizedStopButtons: 1,
      visibleBusyIndicators: 0,
      secret: secret
    },
    transitions: [{ from: "idle", to: "working", secondsAgo: 1, text: secret }]
  }, { state: "working", title: secret, url: secret }, "chrome-extension://abc/assets/tab-status/working.svg", "0.4.7");
  const json = JSON.stringify(result);
  assert.equal(json.includes(secret), false);
  assert.equal(json.includes("chatgpt.com"), false);
  assert.equal(result.localState, "working");
  assert.equal(result.monitorState, "working");
  assert.equal(result.iconState, "idle");
  assert.equal(result.signals.squareStopCandidates, 3);
  assert.equal(result.transitions.length, 1);
  assert.equal(result.browserFaviconKind, "extension-status-svg");
});

test("diagnostic report bounds events and numeric inputs", () => {
  const events = Array.from({ length: 300 }, (_, i) => ({
    from: i % 2 ? "working" : "idle", to: "finished",
    secondsAgo: i === 0 ? Infinity : i, title: "never-leak"
  }));
  const result = sample({
    transitions: events,
    signalInventory: { squareStopCandidates: 50000,
      visibleComposerButtons: -10, recognizedStopButtons: Infinity }
  });
  assert.equal(result.transitions.length, 15);
  assert.equal(result.signals.squareStopCandidates, 100);
  assert.equal(result.signals.visibleComposerButtons, 0);
  assert.equal(result.signals.recognizedStopButtons, 0);
  assert.ok(!JSON.stringify(result).includes("never-leak"));
});

test("diagnostic report rejects arbitrary statuses and untrusted version strings", () => {
  const result = makeSample({
    localState: "private-chat-title", iconState: "super-secret", scriptVersion: "secret",
    visualState: "secret", transitions: [{ from: "secret", to: "private" }]
  }, { state: "other" }, "https://private.example/path", "private-secret");
  assert.equal(result.localState, "unknown");
  assert.equal(result.monitorState, "unknown");
  assert.equal(result.iconState, "unknown");
  assert.equal(result.scriptVersion, "unknown");
  assert.equal(result.extensionVersion, "unknown");
  assert.equal(result.browserFaviconKind, "other-icon");
  assert.equal(JSON.stringify(result).includes("private.example"), false);
});

test("diagnostic warning distinguishes detection, favicon and CSS problems", () => {
  assert.match(diagnosis(sample({ scriptVersion: "0.4.6" })), /veraltetes Skript/);
  assert.match(diagnosis(sample({ stopButtonVisible: true })), /Erkennungswiderspruch/);
  assert.match(diagnosis(sample({ signalInventory: { squareStopCandidates: 1,
    recognizedStopButtons: 0 } })), /Stopp-Symbol/);
  assert.match(diagnosis(sample({ localState: "working", iconState: "idle" })), /Favicon/);
  assert.match(diagnosis(sample({ localState: "working", iconState: "working" }, { state: "working" })), /Vivaldi-CSS/);
});

test("status UI and report remain local until a user explicitly clicks Copy", () => {
  assert.match(popupHtml, /id="captureTabDiagnostics"/);
  assert.match(popupHtml, /id="copyTabDiagnostics"/);
  assert.match(popupJs, /captureTabDiagnostics\.addEventListener\("click", recordTabDiagnostics\)/);
  assert.match(popupJs, /copyTabDiagnostics\.addEventListener\("click", copyDiagnosticReport\)/);
  assert.match(popupJs, /navigator\.clipboard\.writeText\(json\)/);
  assert.match(popupJs, /new Promise\(\(resolve\) => setTimeout\(resolve, 1000\)\)/);
  assert.doesNotMatch(popupJs, /fetch\(["']https?:\/\/|innerHTML\s*=/);
});
