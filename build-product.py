#!/usr/bin/env python3
"""Build dist/OurLittleMiracle.html — the sellable, fully self-contained product.

Inlines style.css, app.js, Chart.js, fonts (base64 woff2), and all images
(recompressed JPEG, base64, deduplicated via a JS asset map). Strips
demo-only markup. The result works offline from a file:// URL on any device.

Requires: pip install -r requirements.txt  (Pillow, for image compression)
Usage: python3 build-product.py
"""
import base64
import io
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent
DIST = ROOT / "dist"
OUT = DIST / "OurLittleMiracle.html"

IMG_MAX_DIM = 1200
IMG_QUALITY = 72


def compress_image_b64(path: Path) -> str:
    img = Image.open(path).convert("RGB")
    if max(img.size) > IMG_MAX_DIM:
        img.thumbnail((IMG_MAX_DIM, IMG_MAX_DIM), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=IMG_QUALITY, optimize=True, progressive=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def font_css_inlined() -> str:
    css = (ROOT / "vendor" / "fonts.css").read_text()

    def repl(m):
        woff = ROOT / "vendor" / m.group(1)
        b64 = base64.b64encode(woff.read_bytes()).decode()
        return f"url('data:font/woff2;base64,{b64}') format('woff2')"

    return re.sub(r"url\('([^']+)'\) format\('woff2'\)", repl, css)


def safe_js(js: str) -> str:
    return js.replace("</script", "<\\/script")


def main() -> None:
    html = (ROOT / "app.html").read_text()

    # Strip demo-only blocks
    html = re.sub(r"<!-- DEMO-ONLY-START -->.*?<!-- DEMO-ONLY-END -->", "", html, flags=re.S)

    # Collect every referenced asset image
    assets = set(re.findall(r"assets/([\w.-]+\.jpg)", html))
    asset_map = {}
    for name in sorted(assets):
        asset_map[name] = compress_image_b64(ROOT / "assets" / name)
        print(f"  {name}: {len(asset_map[name]) // 1024} KB inline")

    # <img src="assets/X"> → <img data-asset="X"> (filled in by bootstrap JS)
    html = re.sub(r'src="assets/([\w.-]+\.jpg)"', r'data-asset="\1"', html)
    # inline background-image styles → data-asset-bg
    html = re.sub(
        r'style="background-image:url\(\'assets/([\w.-]+\.jpg)\'\);"',
        r'data-asset-bg="\1"',
        html,
    )

    # Inline fonts + stylesheet
    html = html.replace(
        '<link rel="stylesheet" href="vendor/fonts.css">',
        "<style>\n" + font_css_inlined() + "\n</style>",
    )
    html = html.replace(
        '<link rel="stylesheet" href="style.css">',
        "<style>\n" + (ROOT / "style.css").read_text() + "\n</style>",
    )

    # Inline Chart.js
    html = html.replace(
        '<script src="vendor/chart.umd.min.js"></script>',
        "<script>\n" + safe_js((ROOT / "vendor" / "chart.umd.min.js").read_text()) + "\n</script>",
    )

    # Asset bootstrap + app.js
    asset_js = "const OLM_ASSETS = " + repr(asset_map).replace("'", '"') + ";\n" + (
        "document.addEventListener('DOMContentLoaded', function() {\n"
        "  document.querySelectorAll('[data-asset]').forEach(function(el) {"
        " el.src = OLM_ASSETS[el.getAttribute('data-asset')] || ''; });\n"
        "  document.querySelectorAll('[data-asset-bg]').forEach(function(el) {"
        " el.style.backgroundImage = \"url('\" + (OLM_ASSETS[el.getAttribute('data-asset-bg')] || '') + \"')\"; });\n"
        "});"
    )
    html = html.replace(
        '<script src="app.js"></script>',
        "<script>\n" + asset_js + "\n</script>\n<script>\n"
        + safe_js((ROOT / "app.js").read_text()) + "\n</script>",
    )

    leftovers = [
        pat for pat in ("vendor/", 'src="app.js"', 'href="style.css"', 'src="assets/', "url('assets/")
        if pat in html
    ]
    if leftovers:
        sys.exit(f"BUILD FAILED — unresolved references: {leftovers}")

    DIST.mkdir(exist_ok=True)
    OUT.write_text(html)
    print(f"\nBuilt {OUT} — {OUT.stat().st_size / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
