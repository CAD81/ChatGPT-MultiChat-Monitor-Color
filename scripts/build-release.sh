#!/usr/bin/env bash
# Build a versioned, ready-to-install extension ZIP with no enclosing folder.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
for tool in node zip unzip sha256sum; do command -v "$tool" >/dev/null; done

version="$(node -p "JSON.parse(require('node:fs').readFileSync('manifest.json', 'utf8')).version")"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERROR: invalid manifest version: $version" >&2
  exit 1
fi

name="ChatGPT-MultiChat-Monitor-Color-v$version.zip"
out_dir="$root/dist"
if [[ "$#" -gt 0 ]]; then out_dir="$1"; fi
mkdir -p "$out_dir"
out_dir="$(cd "$out_dir" && pwd)"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

for file in manifest.json background.js content.js tab-status.js popup.html popup.js offscreen.html offscreen.js LICENSE README.md; do
  if [[ ! -f "$root/$file" ]]; then
    echo "ERROR: missing extension file: $file" >&2
    exit 1
  fi
  cp "$root/$file" "$stage/$file"
done

for dir in assets/icons assets/tab-status sounds; do
  if [[ ! -d "$root/$dir" ]]; then
    echo "ERROR: missing extension resources: $dir" >&2
    exit 1
  fi
  mkdir -p "$stage/$(dirname "$dir")"
  cp -R "$root/$dir" "$stage/$dir"
done

printf 'v%s\n' "$version" > "$stage/VERSION.txt"
archive="$out_dir/$name"
rm -f "$archive" "$archive.sha256"
(
  cd "$stage"
  zip -X -q -r "$archive" \
    manifest.json background.js content.js tab-status.js \
    popup.html popup.js offscreen.html offscreen.js \
    LICENSE README.md VERSION.txt assets/icons assets/tab-status sounds
)

unzip -t "$archive" >/dev/null
unzip -Z -1 "$archive" | grep -Fqx 'manifest.json'
unzip -Z -1 "$archive" | grep -Fqx 'VERSION.txt'
unzip -Z -1 "$archive" | grep -Fqx 'tab-status.js'
unzip -Z -1 "$archive" | grep -Fqx 'assets/tab-status/working.svg'
unzip -Z -1 "$archive" | grep -Fqx 'sounds/pop.wav'

if [[ "$(unzip -p "$archive" VERSION.txt)" != "v$version" ]]; then
  echo "ERROR: VERSION.txt does not match manifest.json" >&2
  exit 1
fi
packaged="$(unzip -p "$archive" manifest.json | node -e '
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", value => input += value);
  process.stdin.on("end", () => process.stdout.write(JSON.parse(input).version));
')"
if [[ "$packaged" != "$version" ]]; then
  echo "ERROR: packaged manifest.json version mismatch" >&2
  exit 1
fi

if unzip -Z -1 "$archive" | grep -Eq '(^|/)(\.git|\.github|tests|scripts)(/|$)'; then
  echo "ERROR: developer-only files inside release ZIP" >&2
  exit 1
fi

(
  cd "$out_dir"
  sha256sum "$name" > "$name.sha256"
)
echo "Validated versioned extension ZIP: $archive"
echo "Version file: v$version"
echo "Checksum: $archive.sha256"
