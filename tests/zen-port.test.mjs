import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = p => fs.readFileSync(path.join(root, p), "utf8");

function colorApi() {
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.runInNewContext(load("zen/zen-colors.js"), sandbox);
  return sandbox.__chatgptVivaldiColors;
}

test("Zen uses Firefox MV3 scripts without Chromium offscreen permission", () => {
  const manifest = JSON.parse(load("zen/manifest.json"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.background.scripts, ["zen-audio.js","background.js"]);
  assert.ok(!manifest.permissions.includes("offscreen"));
  assert.deepEqual(manifest.content_scripts[0].js,
    ["tab-status.js","zen-tab-title.js","content.js"]);
  assert.ok(manifest.browser_specific_settings.gecko.id);
  assert.equal(manifest.action.default_area, "navbar");
  assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions.required, ["none"]);
  assert.equal(manifest.version, JSON.parse(load("manifest.json")).version);
});

test("Zen CSS labels and styles all non-idle states", () => {
  const api = colorApi();
  const css = api.generate(null, { version: "0.4.10" });
  assert.equal(css, api.generate(null, { version: "0.4.99" }));
  assert.equal(css, load("zen/userChrome.css"));
  for (const state of api.STATES) {
    assert.ok(css.includes('[label*="[GPTMM:' + state + ']"]'), state);
    assert.ok(css.includes(api.DEFAULT_COLORS[state]), state);
  }
  assert.match(css, /\.tab-background/);
  assert.doesNotMatch(css, /\[GPTMM:idle\]/);
  assert.doesNotMatch(css, /outline: 2px solid #00FFFF/);
});

test("Zen palette normalization prevents arbitrary CSS injection", () => {
  const api = colorApi();
  const css = api.generate({ working:"red; } body {display:none", error:"#123ABC" });
  assert.ok(css.includes(api.DEFAULT_COLORS.working));
  assert.ok(css.includes("#123ABC"));
  assert.doesNotMatch(css, /display:none/);
  assert.match(api.generate(null,{testOutline:true}), /outline: 2px solid #00FFFF/);
});

test("Zen title bridge follows status and survives ChatGPT title changes", () => {
  let status = "unknown";
  let writes = 0, observer, interval;
  const events = {};
  const document = {
    head: {}, documentElement: {}, _title:"Project A - ChatGPT",
    get title() { return this._title; },
    set title(value) { writes++; this._title = value; }
  };
  class Observer {
    constructor(callback) { this.callback=callback; observer=this; }
    observe() {}
    disconnect() { this.disconnected=true; }
  }
  const sandbox = {
    document, MutationObserver:Observer,
    setInterval(callback) {interval=callback; return 12;},
    clearInterval() {},
    addEventListener(type,callback) {events[type]=callback;},
    browser:{runtime:{id:"test-addon@github",onMessage:{addListener() {}}}},
    __chatgptMultiChatColorStatus:{diagnostics:()=>({state:status})}
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(load("zen/zen-tab-title.js"),sandbox);
  const bridge=sandbox.__chatgptZenTabTitle;
  assert.equal(document.title,"Project A - ChatGPT");
  status="working"; interval();
  assert.equal(document.title,"Project A - ChatGPT [GPTMM:working]");
  assert.equal(bridge.cleanTitle(document.title),"Project A - ChatGPT");
  const before=writes;
  observer.callback();
  assert.equal(writes,before,"no feedback loop on title mutation");
  document.title="Renamed ChatGPT";
  observer.callback();
  assert.equal(document.title,"Renamed ChatGPT [GPTMM:working]");
  status="finished"; interval();
  assert.equal(document.title,"Renamed ChatGPT [GPTMM:finished]");
  status="idle"; interval();
  assert.equal(document.title,"Renamed ChatGPT");
  status="error"; interval(); events.pagehide();
  assert.equal(document.title,"Renamed ChatGPT");
  bridge.dispose();
  assert.equal(observer.disconnected,true);
});

test("Zen audio adapter handles packaged sounds and invalid inputs", async () => {
  const played=[];
  class AudioMock {
    constructor(url) {this.url=url; this.listeners={};}
    addEventListener(kind,cb) {this.listeners[kind]=cb;}
    async play() {played.push({url:this.url,volume:this.volume});this.listeners.ended?.();}
  }
  const sandbox={Audio:AudioMock,browser:{runtime:{getURL:p=>"moz-extension://example/"+p}}};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(load("zen/zen-audio.js"),sandbox);
  const api=sandbox.__chatgptZenAudio;
  assert.equal(await api.play("pop",0.5),true);
  assert.equal(await api.play("off",0.5),false);
  assert.equal(await api.play("../../evil",0.8),false);
  assert.equal(await api.play("page-turn",0.9),true);
  assert.equal(played.length,2);
  assert.equal(played[0].volume,0.5);
  assert.match(played[1].url,/sounds\/page-turn\.wav$/);
});


test("Zen color self-test cycles states and restores the real state", () => {
  let now=1000, state="finished", interval, observer, savedHandler;
  let writes=0;
  const doc={head:{},documentElement:{},_title:"First - ChatGPT",
    get title(){return this._title;},
    set title(value){writes++;this._title=value;}};
  const listeners={};
  const sandbox={
    document:doc,
    Date:{now:()=>now},
    MutationObserver:class {
      constructor(callback){observer=this;this.callback=callback;}
      observe(){}
      disconnect(){this.disconnected=true;}
    },
    setInterval(callback){interval=callback;return 42;},
    clearInterval(){},
    addEventListener(type,callback){listeners[type]=callback;},
    browser:{runtime:{id:"test-addon@github",onMessage:{addListener(handler){savedHandler=handler;}}}},
    __chatgptMultiChatColorStatus:{diagnostics:()=>({state})}
  };
  sandbox.globalThis=sandbox;
  vm.runInNewContext(load("zen/zen-tab-title.js"),sandbox);
  const bridge=sandbox.__chatgptZenTabTitle;
  assert.equal(doc.title,"First - ChatGPT [GPTMM:finished]");
  let response;
  assert.equal(savedHandler({type:"monitor-zen-color-selftest"},null,v=>{response=v;}),true);
  assert.equal(response.ok,true);
  assert.equal(response.durationMs,12000);
  assert.equal(doc.title,"First - ChatGPT [GPTMM:working]");
  now=5001;interval();
  assert.equal(doc.title,"First - ChatGPT [GPTMM:finished]");
  now=9001;interval();
  assert.equal(doc.title,"First - ChatGPT [GPTMM:error]");
  now=13001;interval();
  assert.equal(doc.title,"First - ChatGPT [GPTMM:finished]");
  assert.equal(bridge.diagnostics().selfTestActive,false);
  assert.ok(writes <= 6,"no excessive title writes");
  listeners.pagehide();
  assert.equal(doc.title,"First - ChatGPT");
  now=14000;interval();
  assert.equal(doc.title,"First - ChatGPT","no re-tagging after pagehide");
  listeners.pageshow();
  assert.equal(doc.title,"First - ChatGPT [GPTMM:finished]");
  bridge.dispose();
  assert.equal(doc.title,"First - ChatGPT");
  assert.ok(observer.disconnected);
});

test("Zen packaging includes the isolated tab color self-test", () => {
  const builder=load("scripts/build-zen.py");
  const popupSelftest=load("zen/zen-popup-selftest.js");
  assert.match(builder,/zen-popup-selftest\.js/);
  assert.match(builder,/zenTestTabColors/);
  assert.match(popupSelftest,/monitor-zen-color-selftest/);
  assert.match(popupSelftest,/browser\.tabs\.sendMessage/);
});


test("Zen title bridge removes marker and timer after Firefox addon unload", () => {
  let callback, cleared=false, disconnect=false;
  const runtime={id:"test-addon@github",onMessage:{addListener() {}}};
  const document={_title:"Task - ChatGPT",head:{},documentElement:{},
    get title(){return this._title;},set title(value){this._title=value;}};
  const sandbox={
    document,browser:{runtime},
    MutationObserver:class {constructor(){} observe(){} disconnect(){disconnect=true;}},
    setInterval(fn){callback=fn;return 17;},
    clearInterval(id){assert.equal(id,17);cleared=true;},
    addEventListener(){},
    __chatgptMultiChatColorStatus:{diagnostics:()=>({state:"working"})}
  };
  sandbox.globalThis=sandbox;
  vm.runInNewContext(load("zen/zen-tab-title.js"),sandbox);
  assert.match(document.title,/\[GPTMM:working\]$/);
  runtime.id=undefined;
  callback();
  assert.equal(document.title,"Task - ChatGPT");
  assert.equal(disconnect,true);
  assert.equal(cleared,true);
  callback();
  assert.equal(document.title,"Task - ChatGPT");
});
