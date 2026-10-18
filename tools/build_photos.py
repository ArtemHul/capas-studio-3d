"""Фото товарів: photos/<id>/*.jpg|png|webp|heic → ph/<id>/*-480|960|1600.webp + photos.json.

Ім'я теки = id товару з js/data.js (plana, cerilla, swivel, redonda, monolito, artemon, libro).
Порядок фото — за іменем файлу (01, 02, …); перше стає обкладинкою.
"""
from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageOps

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:
    pass

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "photos"
OUT = ROOT / "ph"
WIDTHS = (480, 960, 1600)
EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}


def model_ids() -> list[str]:
    text = (ROOT / "js" / "data.js").read_text(encoding="utf-8")
    return re.findall(r'\{\s*id:\s*"([a-z0-9_-]+)"', text)


def natural(p: Path):
    return [int(s) if s.isdigit() else s.lower() for s in re.split(r"(\d+)", p.stem)]


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ids = model_ids()
    SRC.mkdir(exist_ok=True)
    for i in ids:
        (SRC / i).mkdir(exist_ok=True)
    unknown = [d.name for d in SRC.iterdir() if d.is_dir() and d.name not in ids]
    if unknown:
        print(f"увага: теки без такого товару (пропускаю): {', '.join(unknown)}")
    if OUT.exists():
        shutil.rmtree(OUT)
    products = {}
    for pid in ids:
        files = sorted((f for f in (SRC / pid).iterdir() if f.suffix.lower() in EXT), key=natural)
        items = []
        for n, f in enumerate(files, 1):
            try:
                im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
            except Exception as e:
                print(f"  ✗ {pid}/{f.name}: не можу відкрити ({e})")
                continue
            w, h = im.size
            dst = OUT / pid
            dst.mkdir(parents=True, exist_ok=True)
            stem = f"{n:02d}"
            srcset = []
            widths = sorted({min(tw, w) for tw in WIDTHS} | ({w} if w < WIDTHS[-1] else set()))
            for tw in widths:
                th = round(h * tw / w)
                path = dst / f"{stem}-{tw}.webp"
                im.resize((tw, th), Image.LANCZOS).save(path, "WEBP", quality=80, method=5)
                srcset.append((tw, path.relative_to(ROOT).as_posix()))
            mid = next((p for tw, p in srcset if tw >= 960), srcset[-1][1])
            items.append({"w": w, "h": h, "src": mid, "srcset": ", ".join(f"{p} {tw}w" for tw, p in srcset)})
        products[pid] = items
        print(f"  {pid:10s} {len(items)} фото" if items else f"  {pid:10s} — немає фото (буде заглушка)")
    (ROOT / "photos.json").write_text(json.dumps({"products": products}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"готово: photos.json, {sum(len(v) for v in products.values())} фото")


if __name__ == "__main__":
    main()
