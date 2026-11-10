"""Stamp website/index.html's stylesheet and script URLs with a content hash, so Cloudflare never serves a stale copy."""
import hashlib
import pathlib
import re

site = pathlib.Path(__file__).resolve().parent.parent / "website"
page = site / "index.html"
html = page.read_text(encoding="utf8")
for name in ("styles.css", "script.js"):
    digest = hashlib.sha256((site / name).read_bytes()).hexdigest()[:10]
    html = re.sub(re.escape(name) + r'(\?v=[0-9a-f]+)?"', f'{name}?v={digest}"', html)
page.write_text(html, encoding="utf8", newline="\n")
