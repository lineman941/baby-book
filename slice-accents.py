#!/usr/bin/env python3
"""Slice the generated watercolor sprite sheets into individual accent images.

Expects: asset-inbox/sheet-a.png  (3 cols x 4 rows, 12 illustrations)
         asset-inbox/sheet-b.png  (2 cols x 2 rows, 4 illustrations)
Writes:  assets/accent-*.jpg and assets/icon-camera.jpg (max 400px, cream bg)

Each cell is auto-trimmed to its illustration (difference from the cream
background) and re-padded, so slight grid misalignment in the generation
doesn't matter. Run: python3 slice-accents.py
"""
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).parent
INBOX = ROOT / "asset-inbox"
OUT = ROOT / "assets"
BG = (245, 237, 230)  # #f5ede6
MAX_SIZE = 400
PAD = 14

SHEET_A = [  # 3 cols x 4 rows, row-major
    "accent-tooth-fairy", "accent-smile", "accent-crawl",
    "accent-steps", "accent-sleep", "accent-food",
    "accent-word", "accent-toy", "accent-stork",
    "accent-letter", "accent-growth", "accent-photos",
]
SHEET_B = ["accent-family", "accent-memories", "icon-camera", "accent-mobile"]


def trim_to_content(img: Image.Image) -> Image.Image:
    bg = Image.new("RGB", img.size, BG)
    diff = ImageChops.difference(img, bg).convert("L")
    bbox = diff.point(lambda p: 255 if p > 18 else 0).getbbox()
    if bbox:
        l, t, r, b = bbox
        l, t = max(0, l - PAD), max(0, t - PAD)
        r, b = min(img.width, r + PAD), min(img.height, b + PAD)
        img = img.crop((l, t, r, b))
    return img


def slice_sheet(path: Path, cols: int, rows: int, names: list) -> None:
    sheet = Image.open(path).convert("RGB")
    cw, ch = sheet.width / cols, sheet.height / rows
    for i, name in enumerate(names):
        c, r = i % cols, i // cols
        cell = sheet.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
        cell = trim_to_content(cell)
        cell.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)
        out = OUT / f"{name}.jpg"
        cell.save(out, "JPEG", quality=85, optimize=True)
        print(f"{out.name}  {cell.size[0]}x{cell.size[1]}  {out.stat().st_size // 1024} KB")


def main() -> None:
    slice_sheet(INBOX / "sheet-a.png", 3, 4, SHEET_A)
    slice_sheet(INBOX / "sheet-b.png", 2, 2, SHEET_B)
    print("\nDone. Now run: python3 build-product.py")


if __name__ == "__main__":
    main()
