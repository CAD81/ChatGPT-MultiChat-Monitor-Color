"""Offline tests for the Zen/Firefox packaging transformations."""
import importlib.util
import json
import pathlib
import tempfile
import unittest
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("zen_builder", ROOT / "scripts/build-zen.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class ZenBuildTests(unittest.TestCase):
    def test_convert_background_replaces_chromium_only_apis(self):
        source = '''function cleanTitle(title) {
  const value = String(title || "")
    .trim();
}
async function ensureOffscreen() {
  await chrome.offscreen.createDocument({});
}
async function playSound(sound, volume) {
  await ensureOffscreen();
  await chrome.runtime.sendMessage({ type: "play" });
}
function cancelPendingDoneSound(tabId) {}
async function closeOffscreenIfIdle() {
  await chrome.offscreen.closeDocument();
}
async function updateBadge() {}
files: ["tab-status.js", "content.js"]
'''
        result = builder.convert_javascript("background.js", source)
        self.assertNotIn("browser.offscreen", result)
        self.assertNotIn("offscreen.createDocument", result)
        self.assertIn("__chatgptZenAudio.play(sound, volume)", result)
        self.assertIn('files: ["tab-status.js", "zen-tab-title.js", "content.js"]', result)
        self.assertIn("GPTMM:", result)

    def test_unsupported_source_layout_fails_loudly(self):
        with self.assertRaises(ValueError):
            builder.convert_javascript("background.js", "function unexpected() {}")
        with self.assertRaisesRegex(ValueError, "expected 2 matches"):
            builder.convert_javascript("content.js", "title: document.title,")

    def test_popup_uses_fixed_zen_css_filename(self):
        source = '''link.download = "ChatGPT-MultiChat-Monitor-Color-v" +
    chrome.runtime.getManifest().version + "-vivaldi-custom.css";
'''
        result = builder.convert_javascript("popup.js", source)
        self.assertIn('link.download = "chatgpt-multichat-monitor-color.css"', result)
        self.assertNotIn("chrome.runtime", result)

    def test_package_has_no_chromium_offscreen_or_developer_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / "zen").mkdir()
            (root / "manifest.json").write_text(json.dumps({"version":"0.4.10"}))
            for name in ("manifest.json","zen-audio.js","zen-tab-title.js","zen-popup-selftest.js","zen-colors.js","userChrome.css"):
                (root / "zen" / name).write_bytes((ROOT / "zen" / name).read_bytes())
            for name in builder.JS_FILES:
                source = "const api = chrome.runtime.id;"
                if name == "background.js":
                    source = '''function cleanTitle(title) {
  const value = String(title || "")
    .trim();
}
async function ensureOffscreen() {}
async function playSound(sound, volume) {}
function cancelPendingDoneSound(tabId) {}
async function closeOffscreenIfIdle() {}
async function updateBadge() {}
files: ["tab-status.js", "content.js"]
'''
                elif name == "content.js":
                    source = "title: document.title,\ntitle: document.title,"
                elif name == "popup.js":
                    source = '''link.download = "ChatGPT-MultiChat-Monitor-Color-v" +
    chrome.runtime.getManifest().version + "-vivaldi-custom.css";
'''
                (root / name).write_text(source)
            for name in builder.PLAIN_FILES:
                contents = ("<body><div id=\"vivaldiColorRows\" class=\"vivaldi-colors\"></div>"
                            "Vivaldi-CSS herunterladen</body>") if name == "popup.html" else "fixture"
                (root / name).write_text(contents)
            for directory in builder.RESOURCE_DIRS:
                (root / directory).mkdir(parents=True)
            for name in ("sounds/pop.wav","assets/tab-status/working.svg","assets/icons/icon16.png"):
                (root / name).write_bytes(b"fixture")
            archive, css = builder.build(root, root / "dist")
            self.assertTrue(archive.exists())
            self.assertTrue(css.exists())
            self.assertTrue((root / "dist" / (archive.name + ".sha256")).exists())
            with zipfile.ZipFile(archive) as bundle:
                names = set(bundle.namelist())
                self.assertIn("manifest.json", names)
                self.assertIn("zen-tab-title.js", names)
                self.assertNotIn("offscreen.js", names)
                self.assertFalse(any(n.startswith(".github/") for n in names))
                self.assertEqual(json.loads(bundle.read("manifest.json"))["background"]["scripts"],
                                 ["zen-audio.js","background.js"])
                self.assertIn("__chatgptZenAudio.play",bundle.read("background.js").decode())
                self.assertNotIn("browser.offscreen",bundle.read("background.js").decode())
                self.assertIn("__chatgptZenTabTitle.cleanTitle",bundle.read("content.js").decode())

    def test_popup_inserts_color_self_test_once(self):
        html = '<body><div id="vivaldiColorRows" class="vivaldi-colors"></div></body>'
        result = builder.convert_popup_html(html)
        self.assertEqual(result.count('id="zenTestTabColors"'), 1)
        self.assertEqual(result.count('src="zen-popup-selftest.js"'), 1)
        with self.assertRaisesRegex(ValueError, "insertion point"):
            builder.convert_popup_html("<body></body>")


if __name__ == "__main__":
    unittest.main()
