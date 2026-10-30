#!/usr/bin/env python3
"""Build an unsigned Zen/Firefox MV3 development ZIP offline.

No GitHub Actions or external services. For about:debugging only;
permanent installation on release Firefox requires Mozilla signing.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS_FILES = (
    "background.js", "content.js", "tab-status.js", "status-diagnostics.js",
    "popup.js", "vivaldi-colors.js",
)
PLAIN_FILES = ("popup.html", "LICENSE", "README.md")
RESOURCE_DIRS = ("assets/icons", "assets/tab-status", "sounds")


def must_replace(source: str, old: str, new: str, path: str, n: int = 1) -> str:
    count = source.count(old)
    if count != n:
        raise ValueError(f"{path}: expected {n} matches of {old!r}, found {count}")
    return source.replace(old, new)


def replace_function_block(text: str, start: str, end: str, replacement: str) -> str:
    if text.count(start) != 1 or text.count(end) != 1:
        raise ValueError(f"Missing/duplicate function boundary {start!r}/{end!r}")
    left = text.index(start)
    right = text.index(end, left + len(start))
    return text[:left] + replacement + text[right:]


def convert_javascript(path: str, source: str) -> str:
    # Use Firefox's promise-based browser.* API, not the chrome callback alias.
    if path == "background.js":
        source = replace_function_block(
            source, 'async function ensureOffscreen() {',
            'async function playSound(sound, volume) {', '',
        )
        source = replace_function_block(
            source, 'async function playSound(sound, volume) {',
            'function cancelPendingDoneSound(tabId) {',
            'async function playSound(sound, volume) {\n'
            '  if (!VALID_SOUNDS.has(sound) || sound === "off") return false;\n'
            '  lastAudioRequestAt = Date.now();\n'
            '  return globalThis.__chatgptZenAudio.play(sound, volume);\n'
            '}\n\n',
        )
        source = replace_function_block(
            source, 'async function closeOffscreenIfIdle() {',
            'async function updateBadge() {',
            'async function closeOffscreenIfIdle() { /* No offscreen document on Firefox. */ }\n\n',
        )
        source = must_replace(
            source, 'files: ["tab-status.js", "content.js"]',
            'files: ["tab-status.js", "zen-tab-title.js", "content.js"]', path,
        )
        source = must_replace(
            source, '  const value = String(title || "")\n',
            '  const value = String(title || "")\n'
            '    .replace(/\\s*\\[GPTMM:(?:working|finished|attention|error|retry|interrupted|draft|pending)\\]\\s*$/, "")\n',
            path,
        )
    elif path == "content.js":
        source = must_replace(
            source, 'title: document.title,',
            'title: globalThis.__chatgptZenTabTitle.cleanTitle(document.title),',
            path, n=2,
        )
    elif path == "popup.js":
        # Accept both current main and PR #12's stable Vivaldi CSS export.
        previous = (
            'link.download = "ChatGPT-MultiChat-Monitor-Color-v" +\n'
            '    chrome.runtime.getManifest().version + "-vivaldi-custom.css";'
        )
        stable = 'link.download = "chatgpt-multichat-monitor-color.css";'
        if previous in source:
            source = must_replace(source, previous, stable, path)
        elif stable not in source:
            raise ValueError("popup.js: unknown CSS download filename expression")
        source = source.replace(
            "CSS heruntergeladen. Die vorherige Datei im VivaldiCSS-Ordner ersetzen und Vivaldi neu starten.",
            "Zen-CSS gespeichert. Im Profilordner chrome/ ablegen, in userChrome.css importieren, Zen neu starten."
        )
        source = source.replace(
            "Für Vivaldi muss die CSS neu exportiert und installiert werden.",
            "Zen-CSS nach Farbänderungen neu exportieren und Zen neu starten."
        )
        source = source.replace("CSS für Vivaldi neu exportieren.", "CSS für Zen neu exportieren.")
        source = source.replace('    version: chrome.runtime.getManifest().version\n', '')
        source = source.replace(
            '    testOutline: vivaldiTestOutline.checked,\n  });',
            '    testOutline: vivaldiTestOutline.checked\n  });',
        )
    source = re.sub(r"\bchrome\.", "browser.", source)
    # Firefox-specific guard for the favicon module.
    return source.replace("globalThis.chrome?.runtime?.getURL", "globalThis.browser?.runtime?.getURL")


def convert_popup_html(source: str) -> str:
    source = source.replace("Tab-Hintergründe (Vivaldi)", "Tab-Hintergründe (Zen)")
    source = source.replace(
        "Vivaldi muss die exportierte CSS-Datei separat laden.",
        "Zen benötigt den CSS-Import in userChrome.css; die Erweiterung kann die Browseroberfläche nicht direkt färben."
    )
    source = source.replace("Vivaldi-CSS herunterladen", "Zen-CSS herunterladen")
    source = source.replace(
        "CSS in Dokumente\\VivaldiCSS legen; alte CSS entfernen. Unter vivaldi://experiments CSS-Modifikationen aktivieren, Ordner unter Darstellung auswählen, Browser neu starten.",
        "Zen: about:support → Profilordner öffnen → chrome/ anlegen. CSS speichern, in userChrome.css @import url('chatgpt-multichat-monitor-color.css'); eintragen und Zen neu starten."
    )
    source = source.replace(
        "Wenn die türkise Umrandung erscheint, aber keine Statusfarben: Vivaldi lädt CSS, kann aber möglicherweise die Favicon-URLs nicht für einzelne Tabs erkennen.",
        "Wenn die türkise Umrandung erscheint, aber keine Statusfarben: Das Tab-Titel-Signal oder die Zen-Tabstruktur stimmt nicht."
    )
    return source


def build(root: Path = ROOT, destination: Path | None = None) -> tuple[Path, Path]:
    destination = destination or root / "dist"
    base_manifest = json.loads((root / "manifest.json").read_text("utf-8"))
    zen_manifest = json.loads((root / "zen/manifest.json").read_text("utf-8"))
    version = zen_manifest["version"]
    if version != base_manifest["version"] or not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise ValueError("Zen manifest version must match common extension version")
    if "offscreen" in zen_manifest.get("permissions", ()):
        raise ValueError("Firefox cannot request chrome.offscreen")
    if zen_manifest.get("background", {}).get("scripts") != ["zen-audio.js", "background.js"]:
        raise ValueError("Unexpected Firefox background script order")
    if zen_manifest["content_scripts"][0]["js"] != ["tab-status.js", "zen-tab-title.js", "content.js"]:
        raise ValueError("Unexpected Firefox content script order")
    destination.mkdir(parents=True, exist_ok=True)
    archive = destination / f"ChatGPT-MultiChat-Monitor-Zen-v{version}.zip"
    css_target = destination / "chatgpt-multichat-monitor-color.css"
    with tempfile.TemporaryDirectory(prefix="gptmm-zen-") as temporary:
        stage = Path(temporary)
        (stage / "manifest.json").write_text(json.dumps(zen_manifest, indent=2) + "\n", encoding="utf-8")
        for name in JS_FILES:
            source = (root / name).read_text("utf-8")
            result = convert_javascript(name, source)
            if name == "vivaldi-colors.js":
                result = (root / "zen/zen-colors.js").read_text("utf-8")
            (stage / name).write_text(result, encoding="utf-8")
        for name in PLAIN_FILES:
            source = (root / name).read_text("utf-8")
            if name == "popup.html":
                source = convert_popup_html(source)
            (stage / name).write_text(source, encoding="utf-8")
        for src, target in [
            ("zen/zen-tab-title.js", "zen-tab-title.js"),
            ("zen/zen-audio.js", "zen-audio.js"),
        ]:
            (stage / target).write_bytes((root / src).read_bytes())
        for directory in RESOURCE_DIRS:
            shutil.copytree(root / directory, stage / directory)
        (stage / "VERSION.txt").write_text(
            f"v{version} (Zen/Firefox unsigned development build)\n", encoding="utf-8"
        )
        archive.unlink(missing_ok=True)
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
            for item in sorted(stage.rglob("*")):
                if item.is_file():
                    bundle.write(item, item.relative_to(stage).as_posix())
    with zipfile.ZipFile(archive) as bundle:
        if bundle.testzip() is not None:
            raise ValueError("Damaged ZIP entry")
        names = set(bundle.namelist())
        for name in ("manifest.json", "background.js", "zen-audio.js", "zen-tab-title.js",
                     "popup.js", "sounds/pop.wav", "assets/tab-status/working.svg"):
            if name not in names:
                raise ValueError(f"Missing asset: {name}")
        if any(name.startswith((".github/", "tests/", "scripts/", ".git/")) for name in names):
            raise ValueError("Developer file found in installable ZIP")
    shutil.copyfile(root / "zen/userChrome.css", css_target)
    for file in (archive, css_target):
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        (file.parent / (file.name + ".sha256")).write_text(
            f"{digest}  {file.name}\n", encoding="ascii"
        )
    return archive, css_target


if __name__ == "__main__":
    try:
        archive, css = build(
            destination=Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else None
        )
    except (OSError, ValueError, KeyError) as exc:
        sys.exit(f"BUILD FAILED: {exc}")
    print(f"Build checked: {archive}\nZen CSS: {css}")
    print("Unsigned: load temporarily using about:debugging")
