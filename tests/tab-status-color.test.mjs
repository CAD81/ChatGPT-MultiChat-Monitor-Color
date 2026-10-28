import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "tab-status.js"), "utf8");
const contentSource = fs.readFileSync(path.join(root, "content.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const states = ["working","finished","attention","error","retry","interrupted","draft","pending","idle"];

function environment(withRuntime = true) {
  const nodes = [];
  const head = {
    appendChild(node) {
      const previous = nodes.indexOf(node);
      if (previous !== -1) nodes.splice(previous, 1);
      nodes.push(node);
      node.parentNode = head;
      return node;
    }
  };
  const document = {
    head,
    createElement(tag) {
      const attrs = {};
      return {
        tagName: tag.toUpperCase(),
        parentNode: null,
        setAttribute(name, value) { attrs[name] = value; },
        getAttribute(name) { return attrs[name] ?? null; },
        remove() {
          const index = nodes.indexOf(this);
          if (index !== -1) nodes.splice(index, 1);
          this.parentNode = null;
        }
      };
    },
    getElementById(id) { return nodes.find((n) => n.id === id) || null; },
    querySelectorAll(selector) {
      assert.equal(selector, 'link[rel~="icon"]');
      return nodes.filter((n) => n.tagName === "LINK" &&
        String(n.rel || "").split(/\s+/).includes("icon"));
    }
  };
  const sandbox = { document };
  if (withRuntime) {
    sandbox.chrome = { runtime: {
      getURL(resource) { return "chrome-extension://test-id/" + resource; }
    } };
  }
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox);
  return { api: sandbox.__chatgptMultiChatColorStatus, document, head, nodes };
}

test("all supported statuses use different packaged icon URLs without duplication", () => {
  const { api, document, nodes } = environment();
  const urls = new Set();
  for (const state of states) {
    assert.equal(api.apply(state), true, state);
    const icon = document.getElementById("chatgpt-multichat-monitor-color-favicon");
    assert.ok(icon);
    const expected = "chrome-extension://test-id/assets/tab-status/" + state + ".svg";
    assert.equal(icon.getAttribute("href"), expected, state);
    urls.add(icon.getAttribute("href"));
    assert.equal(nodes.length, 1, "exactly one extension icon link");
  }
  assert.equal(urls.size, states.length);
});

test("reapplying the same state is idempotent", () => {
  const { api, nodes } = environment();
  api.apply("working");
  const first = nodes[0];
  api.apply("working");
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0], first);
});

test("unknown status safely falls back to idle", () => {
  const { api, nodes } = environment();
  assert.equal(api.apply("__not_a_real_state__"), true);
  assert.match(nodes[0].getAttribute("href"), /\/idle\.svg$/);
});

test("existing ChatGPT icon remains intact and late site icons do not override the status icon", () => {
  const { api, document, head, nodes } = environment();
  const existing = document.createElement("link");
  existing.rel = "icon";
  existing.setAttribute("href", "https://chatgpt.com/favicon.ico");
  head.appendChild(existing);
  api.apply("finished");
  const originalStatusIcon = nodes[1];
  assert.equal(existing.getAttribute("href"), "https://chatgpt.com/favicon.ico");
  const lateSiteIcon = document.createElement("link");
  lateSiteIcon.rel = "icon";
  lateSiteIcon.setAttribute("href", "https://chatgpt.com/newfavicon.ico");
  head.appendChild(lateSiteIcon);
  api.apply("error");
  const newStatusIcon = nodes[nodes.length - 1];
  assert.notEqual(newStatusIcon, originalStatusIcon, "a changed state gets a new favicon link");
  assert.match(newStatusIcon.getAttribute("href"), /\/error\.svg$/);
  assert.equal(nodes.length, 3, "original site icons are kept, old status icon removed");
});

test("missing extension runtime does not throw or modify the site", () => {
  const { api, nodes } = environment(false);
  assert.equal(api.apply("error"), false);
  assert.equal(nodes.length, 0);
});

test("manifest injects status module before monitor and exposes only status icons on ChatGPT", () => {
  assert.deepEqual(manifest.content_scripts[0].js, ["tab-status.js", "content.js"]);
  assert.equal(manifest.version, "0.4.4");
  const assets = manifest.web_accessible_resources;
  assert.equal(assets.length, 1);
  assert.deepEqual(assets[0].resources, ["assets/tab-status/*.svg"]);
  assert.deepEqual(assets[0].matches, ["https://chatgpt.com/*"]);
});

test("state publisher and recovery evaluations repaint the favicon with Pending-aware state", () => {
  assert.match(contentSource, /function sendCurrentState\(\) \{\s*paintTabStatus\(\)/);
  assert.match(contentSource, /function evaluate\(options\) \{\s*paintTabStatus\(\)/);
  assert.match(contentSource, /localState\.state === "idle" && tabPending \? "pending"/);
});

test("Vivaldi CSS provides a distinct tab color for each packaged state", () => {
  const css = fs.readFileSync(path.join(root, "vivaldi/chatgpt-multichat-monitor-color.css"), "utf8");
  assert.match(css, /#tabs-container \.tab:has\(/);
  assert.match(css, /\.tab-header/);
  for (const state of states) {
    const file = path.join(root, "assets/tab-status", state + ".svg");
    assert.ok(fs.existsSync(file), state + " icon is packaged");
    const icon = fs.readFileSync(file, "utf8");
    assert.match(icon, /<svg[^>]+viewBox=/);
    // SVG's required http://www.w3.org/2000/svg namespace is harmless.
    // Reject executable SVG nodes and remote URL-bearing href attributes.
    assert.doesNotMatch(icon, /<script\b|<foreignObject\b|(?:href|xlink:href)=["']https?:\/\//i);
    assert.ok(css.includes("/assets/tab-status/" + state + ".svg"), state + " CSS selector");
  }
});

test("re-injection also loads the icon module before the monitor on existing tabs", () => {
  const background = fs.readFileSync(path.join(root, "background.js"), "utf8");
  assert.ok(background.includes('files: ["tab-status.js", "content.js"]'));
});


test("status change replaces favicon element once, then remains stable", () => {
  const { api, document, nodes } = environment();
  api.apply("idle");
  const idleIcon = document.getElementById("chatgpt-multichat-monitor-color-favicon");
  api.apply("working");
  const workingIcon = document.getElementById("chatgpt-multichat-monitor-color-favicon");
  assert.notEqual(workingIcon, idleIcon, "Chromium gets a fresh icon element on change");
  assert.equal(nodes.length, 1, "no duplicate favicon links remain");
  assert.equal(idleIcon.parentNode, null);
  assert.match(workingIcon.getAttribute("href"), /\/working\.svg$/);
  api.apply("working");
  assert.equal(nodes.length, 1);
  assert.equal(document.getElementById("chatgpt-multichat-monitor-color-favicon"), workingIcon);
  api.apply("finished");
  const finishedIcon = document.getElementById("chatgpt-multichat-monitor-color-favicon");
  assert.notEqual(finishedIcon, workingIcon);
  assert.equal(nodes.length, 1);
});

test("late site favicon is deprioritized without replacing an unchanged status icon", () => {
  const { api, document, head, nodes } = environment();
  api.apply("working");
  const statusIcon = nodes[0];
  const siteIcon = document.createElement("link");
  siteIcon.rel = "icon";
  siteIcon.setAttribute("href", "https://chatgpt.com/favicon2.ico");
  head.appendChild(siteIcon);
  assert.equal(nodes[nodes.length - 1], siteIcon);
  api.apply("working");
  assert.equal(nodes[nodes.length - 1], statusIcon);
  assert.equal(nodes.length, 2);
  api.apply("working");
  assert.equal(nodes.length, 2);
  assert.equal(document.getElementById("chatgpt-multichat-monitor-color-favicon"), statusIcon);
});

test("color tab icons use distinct high-contrast circles and distinguishable glyphs", () => {
  const expectedColors = new Map([
    ["working", "#EAB308"], ["finished", "#22C55E"], ["attention", "#F97316"],
    ["error", "#EF4444"], ["retry", "#38BDF8"], ["interrupted", "#D97706"],
    ["draft", "#A855F7"], ["pending", "#EC4899"], ["idle", "#94A3B8"]
  ]);
  const shapes = new Set();
  const fills = new Set();
  for (const state of states) {
    const svg = fs.readFileSync(path.join(root, "assets/tab-status", state + ".svg"), "utf8");
    assert.match(svg, /viewBox="0 0 16 16"/);
    assert.match(svg, /<circle cx="8" cy="8" r="7\.1"/);
    assert.ok(svg.includes('fill="' + expectedColors.get(state) + '"'), state + " fill");
    assert.ok(svg.includes('aria-label="' + state + '"'), state + " label");
    assert.match(svg, /<title>[^<]+<\/title>/);
    assert.doesNotMatch(svg, /<script\b|<foreignObject\b|(?:href|xlink:href)=["']https?:\/\//i);
    fills.add(expectedColors.get(state));
    const glyph = svg.split("</circle>").pop();
    assert.ok(glyph.includes("<path") || glyph.includes("<rect") || glyph.includes("<circle"), state + " glyph");
    shapes.add(glyph);
  }
  assert.equal(fills.size, 9);
  assert.equal(shapes.size, 9);
});
