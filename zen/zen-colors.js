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
      const value = input && Object.hasOwn(input,state) ? String(input[state]) : "";
      out[state] = /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : DEFAULT_COLORS[state];
    }
    return out;
  }
  function generate(input,options={}) {
    const palette = normalized(input);
    let css = "/* ChatGPT MultiChat Monitor Color (Zen) - stable filename.\n" +
      " * Import from existing userChrome.css; do not replace other mods.\n" +
      " * State is signaled by a suffix on the ChatGPT tab title. */\n";
    for (const state of STATES) {
      const selector = '#tabbrowser-tabs .tabbrowser-tab[label*="[GPTMM:' + state + ']"]';
      css += "\n" + selector + " { --gptmm-tab-color: " + palette[state] + "; }\n";
    }
    const all = STATES.map(s => '#tabbrowser-tabs .tabbrowser-tab[label*="[GPTMM:' + s + ']"]').join(",\n");
    css += "\n:is(" + all + ") > .tab-stack > .tab-background,\n" +
      ":is(" + all + ") .tab-background {\n" +
      "  background: var(--gptmm-tab-color) !important;\n" +
      "  background-image: none !important;\n" +
      "  opacity: 1 !important;\n  box-shadow: none !important;\n}\n";
    css += "\n:is(" + all + ") .tab-label,\n" +
      ":is(" + all + ") .tab-content { color: #111827 !important; text-shadow: none !important; }\n";
    if (options.testOutline === true) {
      css += "\n/* CSS loading diagnostic (optional, not a state match). */\n" +
        "#tabbrowser-tabs .tabbrowser-tab .tab-background { outline: 2px solid #00FFFF !important; }\n";
    }
    return css;
  }
  // Preserve the existing popup palette/settings API across browser builds.
  globalThis.__chatgptVivaldiColors = Object.freeze({DEFAULT_COLORS,STATES,normalized,generate});
})();
