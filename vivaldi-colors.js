(() => {
  "use strict";
  const DEFAULT_COLORS = Object.freeze({
    working:"#EAB308",finished:"#22C55E",attention:"#F97316",
    error:"#EF4444",retry:"#38BDF8",interrupted:"#D97706",
    draft:"#A855F7",pending:"#EC4899"
  });
  const STATES = Object.keys(DEFAULT_COLORS);
  function normalized(input) {
    const out = {};
    for (const state of STATES) {
      const candidate = input && Object.prototype.hasOwnProperty.call(input,state)
        ? String(input[state]) : "";
      out[state] = /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate.toUpperCase() : DEFAULT_COLORS[state];
    }
    return out;
  }
  function selector(state) {
    const path = "/assets/tab-status/" + state + ".svg";
    const attrs = ["src","srcset","style"];
    return attrs.flatMap(attr => [
      '.favicon img[' + attr + '*="' + path + '"]',
      '.favicon[' + attr + '*="' + path + '"]'
    ]).join(", ");
  }
  function generate(input, options = {}) {
    const colors = normalized(input);
    const test = options.testOutline === true;
    const version = /^\d+\.\d+\.\d+$/.test(options.version || "") ? options.version : "unknown";
    let css = "/* ChatGPT MultiChat Monitor Color v" + version + "\n" +
      "   Vivaldi Custom UI CSS. Place this file in the chosen CSS folder.\n" +
      "   Extension settings DO NOT dynamically change the browser tab UI.\n" +
      "   Requires Vivaldi CSS modifications and browser restart.\n" +
      "   If Vivaldi replaces favicon URLs with data: images, status matching will not work.\n" +
      "   Idle retains the Vivaldi theme. */\n";
    const combined = [];
    for (const state of STATES) {
      const target = selector(state);
      css += "\n/* " + state + " */\n#tabs-container .tab:has(" + target +
        ") { --gptmm-status-tab-bg: " + colors[state] + "; }\n";
      combined.push(target);
    }
    const group = combined.join(", ");
    css += "\n#tabs-container .tab:has(" + group + "),\n" +
      "#tabs-container .tab:has(" + group + ") .tab-header {\n" +
      "  background: var(--gptmm-status-tab-bg) !important;\n" +
      "  background-image: none !important;\n  color: #111827 !important;\n}\n";
    css += "#tabs-container .tab:has(" + group + ") .tab-header .title,\n" +
      "#tabs-container .tab:has(" + group + ") .tab-header .close {\n" +
      "  color: #111827 !important; text-shadow: none !important;\n}\n";
    if (test) css += "\n/* Visible CSS-load diagnostic. Remove by disabling test and exporting again. */\n" +
      "#tabs-container .tab .tab-header { outline: 2px solid #00FFFF !important; }\n";
    return css;
  }
  globalThis.__chatgptVivaldiColors = Object.freeze({DEFAULT_COLORS, STATES, normalized, generate});
})();
